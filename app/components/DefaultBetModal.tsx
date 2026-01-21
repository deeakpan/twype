'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';

interface DefaultBetModalProps {
  isOpen: boolean;
  onSetDefault: (amount: number) => void;
}

export default function DefaultBetModal({ isOpen, onSetDefault }: DefaultBetModalProps) {
  const [amount, setAmount] = useState('0.1');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      onSetDefault(numAmount);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-emerald-500/30 rounded-xl shadow-xl p-6 max-w-sm w-full">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-emerald-400">Set Default Bet Amount</h2>
          </div>
          
          <p className="text-sm text-gray-400">
            Set your default bet amount in STRK. This will be used for every "Yes" swipe. You can edit individual bets in your betslip.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">
                Default Amount (STRK)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="any"
                min="0"
                required
                className="w-full px-4 py-3 border border-emerald-500/30 bg-black rounded-lg text-lg font-medium text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                placeholder="0.1"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Set Default Amount
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
