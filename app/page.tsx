'use client';

import { useState, useEffect } from 'react';
import { useStarknetWallet } from './components/WalletProvider';
import Header from './components/Header';
import PredictionCard from './components/PredictionCard';
import Betslip, { Bet } from './components/Betslip';
import DefaultBetModal from './components/DefaultBetModal';
import { useMarkets } from './hooks/useMarkets';

// Mock data - 8 markets for 2026
const mockPredictions = [
  {
    id: '1',
    question: 'Will Bitcoin hit $150k by end of 2026?',
    description: 'Price must close above $150,000 on Dec 31, 2026',
    image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=200&h=200&fit=crop',
    yesProbability: 68,
    stakeVolume: 245.8,
    resolveDate: '2026-12-31',
  },
  {
    id: '2',
    question: 'Will AI replace 50% of software jobs by 2026?',
    description: 'Based on industry employment statistics',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=200&h=200&fit=crop',
    yesProbability: 42,
    stakeVolume: 189.3,
    resolveDate: '2026-12-31',
  },
  {
    id: '3',
    question: 'Will Solana have more daily transactions than Ethereum in 2026?',
    description: 'Average daily transactions over 2026',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&h=200&fit=crop',
    yesProbability: 55,
    stakeVolume: 312.5,
    resolveDate: '2026-12-31',
  },
  {
    id: '4',
    question: 'Will the Fed cut rates by 1.5% in 2026?',
    description: 'Total rate cuts must equal or exceed 1.5%',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=200&fit=crop',
    yesProbability: 38,
    stakeVolume: 156.2,
    resolveDate: '2026-12-31',
  },
  {
    id: '5',
    question: 'Will GPT-6 be released before Q3 2026?',
    description: 'Public release date must be before July 1, 2026',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&h=200&fit=crop',
    yesProbability: 72,
    stakeVolume: 278.9,
    resolveDate: '2026-07-01',
  },
  {
    id: '6',
    question: 'Will Ethereum ETF trading volume exceed $10B in 2026?',
    description: 'Total trading volume must exceed $10 billion',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&h=200&fit=crop',
    yesProbability: 61,
    stakeVolume: 201.4,
    resolveDate: '2026-12-31',
  },
  {
    id: '7',
    question: 'Will US unemployment rate exceed 5% by Q2 2026?',
    description: 'Based on BLS monthly unemployment reports',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=200&fit=crop',
    yesProbability: 29,
    stakeVolume: 134.7,
    resolveDate: '2026-06-30',
  },
  {
    id: '8',
    question: 'Will Tesla stock reach $400 by end of 2026?',
    description: 'Closing price must be at or above $400 on Dec 31, 2026',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
    yesProbability: 48,
    stakeVolume: 167.3,
    resolveDate: '2026-12-31',
  },
];

const BETSLIP_STORAGE_KEY = 'penkmarket_betslip';
const FIRST_LOGIN_KEY = 'penkmarket_first_login';
const DEFAULT_AMOUNT_KEY = 'penkmarket_default_amount';
const SWIPED_IDS_KEY = 'penkmarket_swiped_ids';

export default function Home() {
  const { isConnected, address } = useStarknetWallet();
  const { markets: contractMarkets, loading: loadingMarkets } = useMarkets();
  const [bets, setBets] = useState<Bet[]>([]);
  const [defaultAmount, setDefaultAmount] = useState<number | null>(null);
  const [showDefaultModal, setShowDefaultModal] = useState(false);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  
  // Use contract markets if available, otherwise fall back to mock data
  const predictions = contractMarkets.length > 0 ? contractMarkets.map(m => ({
    id: m.id,
    question: m.question,
    description: m.description,
    image: m.image || 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=200&h=200&fit=crop',
    yesProbability: m.yesProbability,
    stakeVolume: m.stakeVolume,
    resolveDate: m.resolveDate,
  })) : mockPredictions;

  // Load betslip and swipedIds from localStorage
  useEffect(() => {
    const savedBetslip = localStorage.getItem(BETSLIP_STORAGE_KEY);
    if (savedBetslip) {
      try {
        const parsedBets = JSON.parse(savedBetslip) as Bet[];
        setBets(parsedBets);
      } catch (e) {
        console.error('Error loading betslip:', e);
      }
    }

    const savedSwipedIds = localStorage.getItem(SWIPED_IDS_KEY);
    if (savedSwipedIds) {
      try {
        const parsedIds = JSON.parse(savedSwipedIds) as string[];
        setSwipedIds(new Set(parsedIds));
      } catch (e) {
        console.error('Error loading swipedIds:', e);
      }
    }
  }, []);

  // Save betslip to localStorage whenever it changes
  useEffect(() => {
    if (bets.length > 0) {
      localStorage.setItem(BETSLIP_STORAGE_KEY, JSON.stringify(bets));
    } else {
      localStorage.removeItem(BETSLIP_STORAGE_KEY);
    }
  }, [bets]);

  // Save swipedIds to localStorage whenever it changes
  useEffect(() => {
    if (swipedIds.size > 0) {
      localStorage.setItem(SWIPED_IDS_KEY, JSON.stringify(Array.from(swipedIds)));
    } else {
      localStorage.removeItem(SWIPED_IDS_KEY);
    }
  }, [swipedIds]);

  // Check first login and default amount
  useEffect(() => {
    if (isConnected && address) {
      const firstLogin = localStorage.getItem(FIRST_LOGIN_KEY);
      const savedDefault = localStorage.getItem(DEFAULT_AMOUNT_KEY);
      
      if (!firstLogin) {
        // First time login
        localStorage.setItem(FIRST_LOGIN_KEY, 'true');
        setShowDefaultModal(true);
      } else if (savedDefault) {
        setDefaultAmount(parseFloat(savedDefault));
      }
    }
  }, [isConnected, address]);

  const handleBet = (direction: 'left' | 'right', id: string) => {
    const prediction = predictions.find((p) => p.id === id);
    if (!prediction) return;

    // Mark as swiped - remove from view
    setSwipedIds(prev => new Set(prev).add(id));

    // Add to betslip for both Yes and No if default amount is set
    if (defaultAmount !== null && defaultAmount > 0) {
      const side = direction === 'right' ? 'yes' : 'no';
      const existingBetIndex = bets.findIndex((b) => b.id === id);
      
      if (existingBetIndex >= 0) {
        // Update existing bet
        const updatedBets = [...bets];
        updatedBets[existingBetIndex] = {
          ...updatedBets[existingBetIndex],
          side,
          amount: defaultAmount,
        };
        setBets(updatedBets);
      } else {
        // Add new bet
        const newBet: Bet = {
          id,
          question: prediction.question,
          side,
          amount: defaultAmount,
          image: prediction.image,
        };
        setBets([...bets, newBet]);
      }
    }
  };

  const handleRemoveBet = (id: string) => {
    const updatedBets = bets.filter((b) => b.id !== id);
    setBets(updatedBets);
    
    // Remove from swipedIds so card reappears in markets
    setSwipedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    if (updatedBets.length === 0) {
      localStorage.removeItem(BETSLIP_STORAGE_KEY);
    }
  };

  const handleUpdateAmount = (id: string, amount: number) => {
    setBets(bets.map((b) => (b.id === id ? { ...b, amount } : b)));
  };

  const handlePlaceBets = () => {
    // Contract calls are handled in Betslip component
    // This just clears the local state after successful placement
    setBets([]);
    localStorage.removeItem(BETSLIP_STORAGE_KEY);
  };

  const handleSetDefault = (amount: number) => {
    setDefaultAmount(amount);
    localStorage.setItem(DEFAULT_AMOUNT_KEY, amount.toString());
    setShowDefaultModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20 md:pb-32">
      <Header />

      <DefaultBetModal isOpen={showDefaultModal} onSetDefault={handleSetDefault} />

      <div className="w-full px-4 pt-16 md:pt-24">
        {/* Mobile: Single column */}
        <div className="md:hidden space-y-4 pb-8">
          {loadingMarkets && contractMarkets.length === 0 && (
            <div className="text-center text-gray-400 py-8">Loading markets...</div>
          )}
          {predictions
            .filter((prediction) => !swipedIds.has(prediction.id))
            .map((prediction) => (
              <PredictionCard
                key={prediction.id}
                id={prediction.id}
                question={prediction.question}
                description={prediction.description}
                image={prediction.image}
                yesProbability={prediction.yesProbability}
                stakeVolume={prediction.stakeVolume}
                resolveDate={prediction.resolveDate}
                onSwipe={handleBet}
                defaultAmount={defaultAmount}
              />
            ))}
          {predictions.filter((p) => !swipedIds.has(p.id)).length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl font-semibold text-emerald-400 mb-2">No more markets!</p>
              <p className="text-gray-400">Check back later for new predictions.</p>
            </div>
          )}
        </div>

        {/* Desktop: 3 column grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-4 pb-8">
          {predictions
            .filter((prediction) => !swipedIds.has(prediction.id))
            .map((prediction) => (
              <PredictionCard
                key={prediction.id}
                id={prediction.id}
                question={prediction.question}
                description={prediction.description}
                image={prediction.image}
                yesProbability={prediction.yesProbability}
                stakeVolume={prediction.stakeVolume}
                resolveDate={prediction.resolveDate}
                onSwipe={handleBet}
                defaultAmount={defaultAmount}
              />
            ))}
          {predictions.filter((p) => !swipedIds.has(p.id)).length === 0 && (
            <div className="col-span-3 text-center py-12">
              <p className="text-xl font-semibold text-emerald-400 mb-2">No more markets!</p>
              <p className="text-gray-400">Check back later for new predictions.</p>
            </div>
          )}
        </div>
      </div>

      <Betslip
        bets={bets}
        onRemoveBet={handleRemoveBet}
        onUpdateAmount={handleUpdateAmount}
        onPlaceBets={handlePlaceBets}
        defaultAmount={defaultAmount || 0.1}
      />
    </div>
  );
}
