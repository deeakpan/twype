'use client';

import { useEffect, useState } from 'react';
import { useStarknetWallet } from '../components/WalletProvider';
import { getMarketContract, MarketContract } from '../lib/contract';

export function useMarketContract() {
  const { account, isConnected } = useStarknetWallet();
  const [contract, setContract] = useState<MarketContract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initContract() {
      try {
        // Don't initialize contract until we actually need it
        // Just create the instance without calling initialize
        if (isConnected && account) {
          const marketContract = await getMarketContract(account);
          setContract(marketContract);
        } else {
          const marketContract = await getMarketContract();
          setContract(marketContract);
        }
      } catch (error: any) {
        console.error('Failed to create contract instance:', error);
        // If it's an initialization error, still set the contract instance
        // so we can check isAvailable() later
        if (error.message && error.message.includes('Contract initialization failed')) {
          // Still create the instance, it just won't be available
          try {
            const marketContract = await getMarketContract();
            setContract(marketContract);
          } catch (e) {
            // Ignore
          }
        }
      } finally {
        setLoading(false);
      }
    }

    initContract();
  }, [account, isConnected]);

  return { contract, loading, isConnected };
}
