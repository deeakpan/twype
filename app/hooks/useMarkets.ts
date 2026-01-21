'use client';

import { useState, useEffect } from 'react';
import { useMarketContract } from './useMarketContract';
import { MarketInfo, MarketContract } from '../lib/contract';

export interface MarketDisplay {
  id: string;
  question: string;
  description: string;
  image?: string;
  yesProbability: number;
  stakeVolume: number;
  resolveDate: string;
  resolved: boolean;
}

export function useMarkets() {
  const { contract, loading } = useMarketContract();
  const [markets, setMarkets] = useState<MarketDisplay[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);

  useEffect(() => {
    async function fetchMarkets() {
      if (!contract || loading) return;

      // Skip fetching if contract initialization failed
      // This prevents the error from breaking the app
      try {
      // Check if contract is actually available
      // The contract might have failed initialization
      if (!contract || !contract.isAvailable()) {
        console.log('Contract not available, skipping market fetch');
        setMarkets([]);
        setLoadingMarkets(false);
        return;
      }

        // For now, we'll try to fetch markets by ID
        // In production, you'd want a get_market_count function
        const fetchedMarkets: MarketDisplay[] = [];
        
        // Try fetching first 20 markets (adjust as needed)
        // Skip if contract initialization fails
        for (let i = 0; i < 20; i++) {
          try {
            const marketInfo = await contract.getMarketInfo(i);
            
            // Convert market info to display format
            const question = MarketContract.feltToString(marketInfo.question);
            const description = MarketContract.feltToString(marketInfo.description);
            
            // Calculate probability from pool sizes
            const totalPool = Number(marketInfo.totalPool);
            const totalYes = Number(marketInfo.totalYes);
            const yesProbability = totalPool > 0 
              ? Math.round((totalYes / totalPool) * 100) 
              : 50;
            
            // Convert stake volume
            const stakeVolume = MarketContract.u256ToNumber(marketInfo.totalPool);
            
            // Convert resolution date
            const resolutionDate = new Date(Number(marketInfo.resolutionDate) * 1000);
            const resolveDate = resolutionDate.toISOString().split('T')[0];
            
            fetchedMarkets.push({
              id: i.toString(),
              question,
              description,
              yesProbability,
              stakeVolume,
              resolveDate,
              resolved: marketInfo.resolved,
            });
          } catch (error: any) {
            // If it's a contract initialization error, stop trying to fetch markets
            if (error.message && error.message.includes('Contract initialization failed')) {
              console.warn('Contract not available, skipping market fetch:', error.message);
              break;
            }
            // Market doesn't exist, stop trying
            break;
          }
        }
        
        setMarkets(fetchedMarkets);
      } catch (error: any) {
        // If it's a contract initialization error, just log and continue
        if (error.message && error.message.includes('Contract initialization failed')) {
          console.warn('Contract not available, using mock data');
          setMarkets([]); // Empty array, will fall back to mock data in page.tsx
        } else {
          console.error('Failed to fetch markets:', error);
        }
      } finally {
        setLoadingMarkets(false);
      }
    }

    fetchMarkets();
  }, [contract, loading]);

  return { markets, loading: loadingMarkets };
}
