'use client';

import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { useStarknetWallet } from './WalletProvider';
import { useMarketContract } from '../hooks/useMarketContract';
import { STRKToken } from '../lib/strk-token';

export interface Bet {
  id: string;
  question: string;
  side: 'yes' | 'no';
  amount: number;
  image?: string;
}

interface BetslipProps {
  bets: Bet[];
  onRemoveBet: (id: string) => void;
  onUpdateAmount: (id: string, amount: number) => void;
  onPlaceBets: () => void;
  defaultAmount: number;
}

export default function Betslip({ bets, onRemoveBet, onUpdateAmount, onPlaceBets, defaultAmount }: BetslipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isPlacing, setIsPlacing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const { isConnected, account, address } = useStarknetWallet();
  const { contract } = useMarketContract();

  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

  // Fetch balance when connected
  useEffect(() => {
    async function fetchBalance() {
      if (!isConnected || !address) {
        setBalance(null);
        return;
      }

      try {
        const strkToken = new STRKToken(account || undefined);
        const balanceBigInt = await strkToken.balanceOf(address);
        // Convert from wei (18 decimals) to STRK
        const balanceNumber = Number(balanceBigInt) / 1e18;
        setBalance(balanceNumber);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(null);
      }
    }

    fetchBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isConnected, address, account]);

  // Sync input values with bet amounts
  useEffect(() => {
    const newValues: Record<string, string> = {};
    bets.forEach(bet => {
      if (!(bet.id in inputValues)) {
        newValues[bet.id] = bet.amount === 0 ? '' : String(bet.amount);
      } else {
        newValues[bet.id] = inputValues[bet.id];
      }
    });
    setInputValues(newValues);
  }, [bets.length]);

  // Floating button for all screen sizes
  return (
    <>
      {/* Floating button - shown on all devices */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 px-4 py-3 md:px-5 md:py-3 bg-emerald-400 text-black rounded-full shadow-lg hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 z-40"
      >
        <FileText className="w-5 h-5 md:w-6 md:h-6" />
        <span className="text-sm md:text-base font-medium">Betslip</span>
        {bets.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center">
            {bets.length}
          </span>
        )}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4" onClick={() => setIsOpen(false)}>
          <div 
            className="w-full md:w-full md:max-w-2xl bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-xl max-h-[90vh] md:max-h-[80vh] flex flex-col border border-emerald-500/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-emerald-500/30">
              <h2 className="text-xl font-semibold text-emerald-400">Betslip</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {bets.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400">Your betslip is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bets.map((bet) => (
                    <div
                      key={bet.id}
                      className="bg-gray-800 border border-emerald-500/30 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Tiny image */}
                        {bet.image && (
                          <div className="flex-shrink-0">
                            <img
                              src={bet.image}
                              alt={bet.question}
                              className="w-12 h-12 rounded-lg object-cover border border-emerald-500/30"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-white mb-1">{bet.question}</p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                bet.side === 'yes'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}
                            >
                              {bet.side.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => onRemoveBet(bet.id)}
                          className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={inputValues[bet.id] ?? (bet.amount === 0 ? '' : String(bet.amount))}
                          onChange={(e) => {
                            let val = e.target.value;
                            
                            // Only allow numbers and decimal point
                            val = val.replace(/[^0-9.]/g, '');
                            
                            // Prevent multiple decimal points
                            const parts = val.split('.');
                            if (parts.length > 2) {
                              val = parts[0] + '.' + parts.slice(1).join('');
                            }
                            
                            // Update local state immediately for display
                            setInputValues(prev => ({ ...prev, [bet.id]: val }));
                            
                            // Parse and update amount (allow empty or just decimal for typing)
                            if (val === '' || val === '.') {
                              onUpdateAmount(bet.id, 0);
                            } else {
                              const numVal = parseFloat(val);
                              if (!isNaN(numVal) && numVal >= 0) {
                                onUpdateAmount(bet.id, numVal);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val === '' || val === '.' || parseFloat(val || '0') === 0) {
                              onUpdateAmount(bet.id, defaultAmount);
                              setInputValues(prev => ({ ...prev, [bet.id]: String(defaultAmount) }));
                            } else {
                              setInputValues(prev => ({ ...prev, [bet.id]: val }));
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-emerald-500/30 bg-black rounded-lg text-center font-medium text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                          placeholder="0.00"
                        />
                        <span className="text-sm text-gray-400 font-medium">STRK</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {bets.length > 0 && (
              <div className="p-4 md:p-6 border-t border-emerald-500/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-emerald-400">Total</span>
                  <span className="font-semibold text-lg text-emerald-400">{totalAmount.toFixed(4)} STRK</span>
                </div>
                {isConnected && balance !== null && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Your Balance</span>
                    <span className={`font-medium ${balance >= totalAmount ? 'text-emerald-400' : 'text-red-400'}`}>
                      {balance.toFixed(4)} STRK
                    </span>
                  </div>
                )}
                    <button
                      onClick={async () => {
                        if (!isConnected || !account || !contract) {
                          alert('Please connect your wallet first');
                          return;
                        }
                        
                        setIsPlacing(true);
                        try {
                          const strkToken = new STRKToken(account);
                          const contractAddress = process.env.NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS || '0xf0bfd061e7fc1c10c81823d0a18708167376d1a069ec403f3ab4ceeb82fbfc';
                          
                          // Calculate total amount needed
                          const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);
                          const totalAmountWei = BigInt(Math.floor(totalAmount * 1e18));
                          
                          // Check balance
                          const balance = await strkToken.balanceOf(account.address);
                          if (balance < totalAmountWei) {
                            throw new Error(`Insufficient STRK balance. Need ${totalAmount.toFixed(4)} STRK`);
                          }
                          
                          // Check and approve if needed
                          const currentAllowance = await strkToken.allowance(account.address, contractAddress);
                          if (currentAllowance < totalAmountWei) {
                            // Approve contract to spend STRK (approve a bit more for gas efficiency)
                            const approveAmount = totalAmountWei * BigInt(2); // Approve 2x for future bets
                            await strkToken.approve(contractAddress, approveAmount);
                          }
                          
                          // Place each bet on the contract
                          // The contract will now handle the transfer internally via transferFrom
                          for (const bet of bets) {
                            const marketId = parseInt(bet.id);
                            const side = bet.side === 'yes';
                            // Convert amount to wei (STRK uses 18 decimals)
                            const amount = BigInt(Math.floor(bet.amount * 1e18));
                            
                            // Contract handles transfer internally now
                            await contract.placeBet(marketId, side, amount);
                          }
                          
                          // Clear betslip after successful placement
                          onPlaceBets();
                          setIsOpen(false);
                          alert('Bets placed successfully!');
                        } catch (error: any) {
                          console.error('Failed to place bets:', error);
                          alert(`Failed to place bets: ${error.message || 'Unknown error'}`);
                        } finally {
                          setIsPlacing(false);
                        }
                      }}
                      disabled={isPlacing || !isConnected || !account || !contract}
                      className="w-full py-3 px-4 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPlacing ? 'Placing Bets...' : 'Place All Bets'}
                    </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
