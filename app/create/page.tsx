'use client';

import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Target, FileText, Zap, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
import { useMarketContract } from '../hooks/useMarketContract';
import { useStarknetWallet } from '../components/WalletProvider';
import { RpcProvider, constants, Contract } from 'starknet';

// Chainlink Aggregator ABI (minimal - just latest_answer)
const CHAINLINK_ABI = [
  {
    type: 'function',
    name: 'latest_answer',
    inputs: [],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
];

const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/O6ulR1EPy8Sn4fYG8_kqU';
const provider = new RpcProvider({
  nodeUrl: RPC_URL,
  chainId: constants.StarknetChainId.SN_SEPOLIA,
});

export default function CreateMarketPage() {
  const { isConnected } = useStarknetWallet();
  const { contract } = useMarketContract();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  
  // Chainlink feed addresses (you provided these)
  const CHAINLINK_FEEDS = {
    'BTC/USD': '0x258b8f498b767c200577227e3e9f009c9b0fe7f6a3c8c2c24efd588c54747a',
    'ETH/USD': '0x8ed94479864161b612f4d77555e3a71089b2bfcae2d544e09b617113932611',
    'STRK/USD': '0xa5db422ee7c28beead49303646e44ef9cbb8364eeba4d8af9ac06a3b556937',
    'USDC/USD': '0x6a3140f624837b8e9bf17a71a154449d8b2575c3a32fe75ef34c2bd466e75f6',
    'USDT/USD': '0x70a6db1fa19b2b09d13611445902d28d295eae25bc82bd7ace4780a28e56fc3',
    'DAI/USD': '0x469651f29350f9831e616388fd1ba5af034337b10ce7e7d5666edc27efb4a32',
    'LINK/USD': '0x44e29893a7bd694e8335919ce1daaf99128e0295daad7852e59b0791cc3468e',
  };

  const [formData, setFormData] = useState({
    question: '',
    description: '',
    resolutionDate: '',
    resolutionTime: '',
    selectedFeed: 'BTC/USD' as keyof typeof CHAINLINK_FEEDS,
    thresholdValue: '',
    condition: 1, // 0 = less than, 1 = greater than or equal
  });
  const [priceOffset, setPriceOffset] = useState('');

  // Fetch current price - try Chainlink first, fallback to API
  const fetchCurrentPrice = async (feedAddress: string) => {
    try {
      setLoadingPrice(true);
      
      // Try Chainlink on-chain first
      try {
        const result = await provider.callContract({
          contractAddress: feedAddress,
          entrypoint: 'latest_answer',
          calldata: [],
        });
        
        // Debug: log the response structure
        console.log('Chainlink response:', result);
        
        // Extract result from response
        const response = result as any;
        
        // Try different response structures
        let priceRaw: bigint | null = null;
        
        if (response?.result && Array.isArray(response.result) && response.result.length > 0) {
          priceRaw = BigInt(response.result[0]);
        } else if (Array.isArray(response) && response.length > 0) {
          priceRaw = BigInt(response[0]);
        } else if (response?.result?.[0]) {
          priceRaw = BigInt(response.result[0]);
        } else if (typeof response === 'string') {
          priceRaw = BigInt(response);
        }
        
        if (priceRaw !== null) {
          // Chainlink returns price with 8 decimals
          const price = Number(priceRaw) / 1e8;
          setCurrentPrice(price);
          return; // Success, exit early
        }
      } catch (chainlinkError) {
        console.warn('Chainlink on-chain fetch failed, trying API fallback:', chainlinkError);
      }
      
      // Fallback: Use CoinGecko API for price
      const feedToSymbol: Record<string, string> = {
        'BTC/USD': 'bitcoin',
        'ETH/USD': 'ethereum',
        'STRK/USD': 'starknet',
        'USDC/USD': 'usd-coin',
        'USDT/USD': 'tether',
        'DAI/USD': 'dai',
        'LINK/USD': 'chainlink',
      };
      
      const symbol = feedToSymbol[formData.selectedFeed];
      if (symbol) {
        const apiResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`
        );
        const data = await apiResponse.json();
        
        if (data[symbol]?.usd) {
          setCurrentPrice(data[symbol].usd);
          return;
        }
      }
      
      // If both fail, set to null
      setCurrentPrice(null);
    } catch (error: any) {
      console.error('Error fetching price:', error);
      setCurrentPrice(null);
    } finally {
      setLoadingPrice(false);
    }
  };

  // Fetch price when feed changes
  useEffect(() => {
    const feedAddress = CHAINLINK_FEEDS[formData.selectedFeed];
    if (feedAddress) {
      fetchCurrentPrice(feedAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selectedFeed]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      setMessage({ text: 'Please connect your wallet first', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!contract) {
      setMessage({ text: 'Contract not initialized', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Validate form
    if (!formData.question.trim()) {
      setMessage({ text: 'Please enter a question', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!formData.resolutionDate || !formData.resolutionTime) {
      setMessage({ text: 'Please select a resolution date and time', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!formData.thresholdValue || parseFloat(formData.thresholdValue) <= 0) {
      setMessage({ text: 'Please enter a valid threshold value', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setLoading(true);
      
      // Convert date/time to timestamp
      const dateTimeString = `${formData.resolutionDate}T${formData.resolutionTime}`;
      const resolutionDate = new Date(dateTimeString);
      const timestamp = BigInt(Math.floor(resolutionDate.getTime() / 1000));

      // Convert threshold value to bigint with Chainlink's 8 decimals
      // Chainlink prices use 8 decimals (e.g., $150k = 150000 * 10^8)
      const thresholdValue = BigInt(Math.floor(parseFloat(formData.thresholdValue) * 1e8));
      
      // Get Chainlink feed address for selected feed
      const chainlinkFeedAddress = CHAINLINK_FEEDS[formData.selectedFeed];
      if (!chainlinkFeedAddress) {
        throw new Error('Invalid feed selected');
      }

      const result = await contract.createMarket(
        formData.question,
        formData.description || formData.question,
        timestamp,
        chainlinkFeedAddress,
        thresholdValue,
        formData.condition
      );

      setMessage({ 
        text: `Market created successfully! Market ID: ${result.toString()}`, 
        type: 'success' 
      });
      
      // Reset form
      setFormData({
        question: '',
        description: '',
        resolutionDate: '',
        resolutionTime: '',
        selectedFeed: 'BTC/USD',
        thresholdValue: '',
        condition: 1,
      });

      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      console.error('Error creating market:', error);
      setMessage({ 
        text: error.message || 'Failed to create market. Please try again.', 
        type: 'error' 
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const availableFeeds = Object.keys(CHAINLINK_FEEDS) as Array<keyof typeof CHAINLINK_FEEDS>;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <div className="pt-16 md:pt-24 px-4 max-w-3xl mx-auto pb-12">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">Create Market</h1>
        <p className="text-gray-400 mb-8">Create a new prediction market for others to bet on</p>

        {!isConnected && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-sm">
              Please connect your wallet to create a market
            </p>
          </div>
        )}

        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Question *
            </label>
            <p className="text-xs text-gray-400 mb-3">
              The prediction question that will be resolved (e.g., "Will Bitcoin hit $150k by end of 2026?")
            </p>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="Will Bitcoin hit $150k by end of 2026?"
              className="w-full px-4 py-2 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Description
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Additional details about how the market will be resolved
            </p>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Price must close above $150,000 on Dec 31, 2026"
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Resolution Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Resolution Date *
              </label>
              <input
                type="date"
                value={formData.resolutionDate}
                onChange={(e) => setFormData({ ...formData, resolutionDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-gray-800 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Resolution Time *
              </label>
              <input
                type="time"
                value={formData.resolutionTime}
                onChange={(e) => setFormData({ ...formData, resolutionTime: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Chainlink Feed Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Chainlink Price Feed *
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Select the Chainlink price feed to use for market resolution
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {availableFeeds.map((feed) => (
                <button
                  key={feed}
                  type="button"
                  onClick={() => setFormData({ ...formData, selectedFeed: feed })}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    formData.selectedFeed === feed
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {feed}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Condition *
            </label>
            <p className="text-xs text-gray-400 mb-3">
              How should the price compare to the threshold?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, condition: 0 })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.condition === 0
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Less Than (&lt;)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, condition: 1 })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.condition === 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Greater Than or Equal (≥)
              </button>
            </div>
          </div>

          {/* Threshold Value */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Threshold Value *
            </label>
            
            {/* Current Price Display */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">Current {formData.selectedFeed} Price:</span>
                  {currentPrice !== null ? (
                    <span className="text-lg font-bold text-emerald-400">
                      ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : loadingPrice ? (
                    <span className="text-sm text-gray-400">Loading...</span>
                  ) : (
                    <span className="text-sm text-yellow-400">Unable to fetch (enter manually)</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fetchCurrentPrice(CHAINLINK_FEEDS[formData.selectedFeed])}
                  disabled={loadingPrice}
                  className="p-1.5 hover:bg-emerald-500/20 rounded transition-colors"
                  title="Refresh price"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-400 ${loadingPrice ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              {formData.condition === 0 
                ? 'Enter percentage below current price (e.g., if current is $100k, enter 5% to set threshold at $95k)'
                : 'Enter percentage above current price (e.g., if current is $100k, enter 5% to set threshold at $105k)'}
            </p>

            {/* Offset Input (Percentage) */}
            {currentPrice !== null && (
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    {formData.condition === 0 ? 'Current -' : 'Current +'}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={priceOffset}
                      onChange={(e) => {
                        setPriceOffset(e.target.value);
                        const percent = parseFloat(e.target.value) || 0;
                        // Calculate threshold based on percentage
                        const threshold = formData.condition === 0 
                          ? currentPrice * (1 - percent / 100)  // Less than: current * (1 - %)
                          : currentPrice * (1 + percent / 100);  // Greater than: current * (1 + %)
                        setFormData({ ...formData, thresholdValue: threshold.toFixed(2) });
                      }}
                      placeholder="0"
                      className="w-full px-4 py-2 pr-12 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-medium text-sm">
                      %
                    </span>
                  </div>
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    = {formData.thresholdValue ? `$${parseFloat(formData.thresholdValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                  </span>
                </div>
              </div>
            )}

            {/* Final Threshold Input (editable) */}
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.thresholdValue}
                  onChange={(e) => {
                    setFormData({ ...formData, thresholdValue: e.target.value });
                    // Calculate percentage offset when manually editing
                    if (currentPrice !== null) {
                      const threshold = parseFloat(e.target.value) || 0;
                      const percent = formData.condition === 0
                        ? ((currentPrice - threshold) / currentPrice) * 100
                        : ((threshold - currentPrice) / currentPrice) * 100;
                      setPriceOffset(percent > 0 && percent <= 20 ? percent.toFixed(1) : '');
                    }
                  }}
                  placeholder={currentPrice ? currentPrice.toFixed(2) : "150000"}
                  className="w-full px-4 py-2 pr-12 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-medium text-sm">
                  USD
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              You can manually edit the threshold value above, or use the offset input to calculate from current price.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !isConnected}
              className="w-full px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Market...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Create Market
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
