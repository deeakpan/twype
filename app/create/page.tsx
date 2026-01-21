'use client';

import { useState } from 'react';
import { Calendar, DollarSign, Target, FileText, Zap } from 'lucide-react';
import Header from '../components/Header';
import { useMarketContract } from '../hooks/useMarketContract';
import { useStarknetWallet } from '../components/WalletProvider';

export default function CreateMarketPage() {
  const { isConnected } = useStarknetWallet();
  const { contract } = useMarketContract();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    resolutionDate: '',
    resolutionTime: '',
    oraclePairId: 'BTC/USD',
    thresholdValue: '',
  });

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

      // Convert threshold value to bigint (assuming it's in the base unit, e.g., 100000 for 100k)
      const thresholdValue = BigInt(Math.floor(parseFloat(formData.thresholdValue) * 1e18));

      const result = await contract.createMarket(
        formData.question,
        formData.description || formData.question,
        timestamp,
        formData.oraclePairId,
        thresholdValue
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
        oraclePairId: 'BTC/USD',
        thresholdValue: '',
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

  const commonOraclePairs = [
    'BTC/USD',
    'ETH/USD',
    'SOL/USD',
    'TSLA/USD',
    'SPX/USD',
    'AAPL/USD',
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <div className="pt-24 px-4 max-w-3xl mx-auto pb-12">
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

          {/* Oracle Pair ID */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Oracle Pair ID *
            </label>
            <p className="text-xs text-gray-400 mb-3">
              The data pair to use for oracle resolution (e.g., BTC/USD for Bitcoin price)
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {commonOraclePairs.map((pair) => (
                <button
                  key={pair}
                  type="button"
                  onClick={() => setFormData({ ...formData, oraclePairId: pair })}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    formData.oraclePairId === pair
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {pair}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={formData.oraclePairId}
              onChange={(e) => setFormData({ ...formData, oraclePairId: e.target.value })}
              placeholder="BTC/USD"
              className="w-full px-4 py-2 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              required
            />
          </div>

          {/* Threshold Value */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Threshold Value *
            </label>
            <p className="text-xs text-gray-400 mb-3">
              The value that must be reached for YES to win (e.g., 150000 for $150k)
            </p>
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.thresholdValue}
                  onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value })}
                  placeholder="150000"
                  className="w-full px-4 py-2 pr-12 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-medium text-sm">
                  USD
                </span>
              </div>
            </div>
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
