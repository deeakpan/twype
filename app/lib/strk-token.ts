'use client';

import { Contract, RpcProvider, constants, AccountInterface, uint256 } from 'starknet';

// STRK token address on Sepolia testnet
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

// ERC20 ABI matching starknet.js v9 format (from walletconnect example)
const ERC20_ABI = [
  {
    "inputs": [
      {
        "name": "spender",
        "type": "felt"
      },
      {
        "name": "amount",
        "type": "Uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "name": "success",
        "type": "felt"
      }
    ],
    "stateMutability": "external",
    "type": "function"
  },
  {
    "inputs": [
      {
        "name": "recipient",
        "type": "felt"
      },
      {
        "name": "amount",
        "type": "Uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "success",
        "type": "felt"
      }
    ],
    "stateMutability": "external",
    "type": "function"
  },
  {
    "inputs": [
      {
        "name": "owner",
        "type": "felt"
      },
      {
        "name": "spender",
        "type": "felt"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "remaining",
        "type": "Uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "name": "account",
        "type": "felt"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "Uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
];

export class STRKToken {
  private contract: Contract | null = null;
  private account: AccountInterface | null = null;
  private provider: RpcProvider;
  private initializationFailed: boolean = false;

  constructor(account?: AccountInterface) {
    this.provider = new RpcProvider({
      nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU',
      chainId: constants.StarknetChainId.SN_SEPOLIA,
    });
    
    if (account) {
      this.account = account;
    }
    
    // Don't initialize contract in constructor - do it lazily
  }

  private async initialize() {
    if (this.contract) return;
    if (this.initializationFailed) {
      throw new Error('Contract initialization previously failed');
    }

    // Validate ABI before attempting to create contract
    if (!ERC20_ABI || !Array.isArray(ERC20_ABI) || ERC20_ABI.length === 0) {
      console.error('STRKToken: Invalid ABI format');
      this.initializationFailed = true;
      this.contract = null;
      throw new Error('STRKToken: Invalid ABI format');
    }

    try {
      // Use object format for starknet.js v9 Contract constructor
      // Format: { abi, address, providerOrAccount }
      if (this.account) {
        // If account is available, use it as providerOrAccount
        this.contract = new Contract({ 
          abi: ERC20_ABI, 
          address: STRK_TOKEN_ADDRESS, 
          providerOrAccount: this.account 
        });
      } else {
        // Otherwise use provider
        this.contract = new Contract({ 
          abi: ERC20_ABI, 
          address: STRK_TOKEN_ADDRESS, 
          providerOrAccount: this.provider 
        });
      }
    } catch (error: any) {
      console.error('STRKToken contract initialization failed:', error);
      console.error('Error details:', {
        message: error.message,
        abiLength: ERC20_ABI.length,
        address: STRK_TOKEN_ADDRESS,
        hasProvider: !!this.provider,
        hasAccount: !!this.account
      });
      this.initializationFailed = true;
      this.contract = null;
      // Don't throw, just mark as failed - balanceOf will handle it
      return;
    }
  }

  setAccount(account: AccountInterface) {
    this.account = account;
    if (this.contract) {
      this.contract.connect(account);
    }
  }

  // Approve contract to spend STRK
  async approve(spenderAddress: string, amount: bigint): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');
    await this.contract.approve(spenderAddress, amount);
  }

  // Transfer STRK
  async transfer(recipientAddress: string, amount: bigint): Promise<void> {
    await this.initialize();
    if (!this.account) throw new Error('Account not connected');
    if (!this.contract) throw new Error('Contract not initialized');
    await this.contract.transfer(recipientAddress, amount);
  }

  // Check allowance
  async allowance(ownerAddress: string, spenderAddress: string): Promise<bigint> {
    await this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');
    const result = await this.contract.allowance(ownerAddress, spenderAddress);
    return result;
  }

  // Get balance
  async balanceOf(accountAddress: string): Promise<bigint> {
    // Don't initialize if it already failed
    if (this.initializationFailed) {
      return BigInt(0);
    }

    try {
      await this.initialize();
    } catch (error: any) {
      // If initialization fails, mark as failed and return 0
      this.initializationFailed = true;
      console.warn('Failed to initialize STRKToken contract, returning 0 balance:', error.message);
      return BigInt(0);
    }
    
    if (!this.contract) {
      return BigInt(0);
    }
    
    try {
      const result = await this.contract.balanceOf(accountAddress);
      // balanceOf returns { balance: Uint256 } in starknet.js v9
      if (result && typeof result === 'object' && 'balance' in result) {
        return uint256.uint256ToBN(result.balance);
      }
      // Fallback for direct bigint return
      return typeof result === 'bigint' ? result : BigInt(0);
    } catch (error: any) {
      console.error('Failed to fetch balance:', error);
      return BigInt(0);
    }
  }
}
