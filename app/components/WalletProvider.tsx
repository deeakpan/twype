'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletAccountV5, AccountInterface, RpcProvider, constants, walletV5, validateAndParseAddress } from 'starknet';
import { createStore, type Store } from '@starknet-io/get-starknet-discovery';
import type { WalletWithStarknetFeatures } from '@starknet-io/get-starknet-wallet-standard/features';
import { WALLET_API } from '@starknet-io/types-js';

interface WalletContextType {
  account: AccountInterface | null;
  address: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useStarknetWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useStarknetWallet must be used within WalletProvider');
  }
  return context;
}

// Helper to scan for wallets
async function scanForWallets(): Promise<WalletWithStarknetFeatures[]> {
  const store: Store = createStore();
  const wallets: WalletWithStarknetFeatures[] = store.getWallets();
  return wallets;
}

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletInstance, setWalletInstance] = useState<WalletWithStarknetFeatures | null>(null);

  // Check for existing wallet connection on mount (silent check, no auto-reconnect)
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const wallets = await scanForWallets();
        if (wallets.length === 0) {
          return;
        }

        // Check each wallet for connection
        for (const wallet of wallets) {
          try {
            const permissions = await walletV5.getPermissions(wallet);
            const hasAccountsPermission = (permissions as WALLET_API.Permission[]).includes(WALLET_API.Permission.ACCOUNTS);
            
            if (hasAccountsPermission) {
              // Create RPC provider
              const provider = new RpcProvider({
                nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU',
                chainId: constants.StarknetChainId.SN_SEPOLIA,
              });

              // Follow example: connect FIRST, then request accounts
              const account = await WalletAccountV5.connect(provider, wallet);
              
              // Now request accounts
              const accountsResult = await walletV5.requestAccounts(wallet);
              
              if (typeof accountsResult === 'string') {
                continue;
              }
              
              if (Array.isArray(accountsResult) && accountsResult.length > 0) {
                const address = validateAndParseAddress(accountsResult[0]);

                if (account && account.address) {
                  setAccount(account);
                  setAddress(address);
                  setIsConnected(true);
                  setWalletInstance(wallet);
                  return; // Found connected wallet, exit
                }
              }
            }
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
        // Silent fail on mount
      }
    };

    checkConnection();
  }, []);

  const handleConnect = async () => {
    try {
      console.log('🔌 Connect button clicked');
      
      // Clear current state first
      setAccount(null);
      setAddress(null);
      setIsConnected(false);
      setWalletInstance(null);
      
      // Small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Scan for available wallets
      const wallets = await scanForWallets();
      
      if (wallets.length === 0) {
        alert('No wallets found. Please install ArgentX or Braavos wallet extension.');
        return;
      }

      // Filter for ArgentX and Braavos
      const targetWallets = wallets.filter(w => 
        w.name.toLowerCase().includes('argent') || 
        w.name.toLowerCase().includes('braavos')
      );

      if (targetWallets.length === 0) {
        alert('ArgentX or Braavos wallet not found. Please install one of these wallets.');
        return;
      }

      // Use the first available wallet
      const selectedWallet = targetWallets[0];
      console.log('📱 Selected wallet:', selectedWallet.name);

      // Create RPC provider for Sepolia
      const provider = new RpcProvider({
        nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU',
        chainId: constants.StarknetChainId.SN_SEPOLIA,
      });

      // Follow example pattern EXACTLY: connect FIRST, then request accounts
      console.log('1️⃣ Connecting WalletAccountV5...');
      const account = await WalletAccountV5.connect(provider, selectedWallet);
      console.log('✅ WalletAccount created:', account.address);

      // Now request accounts - this should prompt the wallet
      console.log('2️⃣ Requesting accounts (wallet should prompt now)...');
      const accountsResult = await walletV5.requestAccounts(selectedWallet);
      console.log('📋 Accounts result:', accountsResult);
      
      if (typeof accountsResult === 'string') {
        console.error('❌ Wallet request failed:', accountsResult);
        alert(`Wallet connection failed: ${accountsResult}`);
        return;
      }

      if (!Array.isArray(accountsResult) || accountsResult.length === 0) {
        console.error('❌ No accounts returned');
        alert('No accounts found. Please ensure your wallet is unlocked.');
        return;
      }

      const walletAddress = validateAndParseAddress(accountsResult[0]);
      console.log('📍 Wallet address:', walletAddress);

      if (!account || !account.address) {
        console.error('❌ Failed to create account');
        alert('Failed to create account. Please try again.');
        return;
      }

      // Check permissions to verify connection
      const permissions = await walletV5.getPermissions(selectedWallet);
      const hasAccountsPermission = (permissions as WALLET_API.Permission[]).includes(WALLET_API.Permission.ACCOUNTS);
      
      if (!hasAccountsPermission) {
        console.warn('⚠️ Wallet does not have ACCOUNTS permission');
        alert('Wallet connection failed: No accounts permission granted.');
        return;
      }

      // Store wallet instance and account
      setWalletInstance(selectedWallet);
      setAccount(account);
      setAddress(walletAddress);
      setIsConnected(true);
      
      console.log('🎉 Wallet connected successfully:', walletAddress);
    } catch (error: any) {
      console.error('❌ Failed to connect wallet:', error);
      console.error('Error details:', error);
      
      // Clear state on error
      setAccount(null);
      setAddress(null);
      setIsConnected(false);
      setWalletInstance(null);
      
      // Show user-friendly error
      alert(`Connection failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      console.log('🔌 Disconnecting wallet...');

      // Clear all state
      setAccount(null);
      setAddress(null);
      setIsConnected(false);
      setWalletInstance(null);
      
      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      // Still clear state
      setAccount(null);
      setAddress(null);
      setIsConnected(false);
      setWalletInstance(null);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        address,
        isConnected,
        connect: handleConnect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
