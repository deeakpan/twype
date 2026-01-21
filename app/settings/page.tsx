'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Wallet, Shield, Moon, Globe, Eye, EyeOff, TrendingUp, Zap, User } from 'lucide-react';
import Header from '../components/Header';

const DEFAULT_AMOUNT_KEY = 'penkmarket_default_amount';

export default function SettingsPage() {
  const [defaultAmount, setDefaultAmount] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketResolved: true,
    betPlaced: true,
  });
  const [privacy, setPrivacy] = useState({
    showAddress: false,
    showBets: true,
    showPortfolio: true,
  });
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [slippage, setSlippage] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultAmountSectionRef = useRef<HTMLDivElement>(null);

  // Load current default amount
  useEffect(() => {
    const savedDefault = localStorage.getItem(DEFAULT_AMOUNT_KEY);
    if (savedDefault) {
      setDefaultAmount(savedDefault);
    }
  }, []);

  // Scroll to default amount section and focus input when page loads
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section');
    
    if (section === 'default-amount' || !section) {
      setTimeout(() => {
        if (defaultAmountSectionRef.current) {
          defaultAmountSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.select();
            }
          }, 300);
        }
      }, 100);
    }
  }, []);

  const handleSave = () => {
    if (!defaultAmount || defaultAmount.trim() === '') {
      setSaveMessage('Please enter an amount');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    const amount = parseFloat(defaultAmount);
    if (isNaN(amount) || amount <= 0) {
      setSaveMessage('Please enter a valid amount greater than 0');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    localStorage.setItem(DEFAULT_AMOUNT_KEY, amount.toString());
    setSaveMessage('✓ Default amount saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <div className="pt-24 px-4 max-w-3xl mx-auto pb-12">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Manage your account preferences and betting settings</p>
        
        <div className="space-y-6">
          {/* Betting Settings */}
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Betting Settings</h2>
            </div>
            
            <div className="space-y-6">
              {/* Default Bet Amount */}
              <div ref={defaultAmountSectionRef}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Bet Amount (STRK)
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Set your default bet amount for quick betting on prediction markets.
                </p>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={defaultAmount}
                      onChange={(e) => setDefaultAmount(e.target.value)}
                      placeholder="0.1"
                      className="w-full px-4 py-2 pr-12 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-medium">
                      STRK
                    </span>
                  </div>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                  >
                    Save
                  </button>
                </div>
                {saveMessage && (
                  <div className={`mt-3 px-4 py-2 rounded-lg ${
                    saveMessage.includes('saved') 
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' 
                      : 'bg-red-500/20 border border-red-500/50 text-red-400'
                  }`}>
                    <p className="text-sm font-medium">{saveMessage}</p>
                  </div>
                )}
              </div>

              {/* Slippage Tolerance */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Slippage Tolerance (%)
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Maximum price movement you're willing to accept for your bets.
                </p>
                <div className="flex gap-2">
                  {['0.5', '1', '2', '3'].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSlippage(val)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        slippage === val
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    placeholder="Custom"
                    className="w-24 px-3 py-2 bg-gray-800 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Email Notifications</p>
                  <p className="text-xs text-gray-400">Receive updates via email</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, email: !notifications.email})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.email ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.email ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Push Notifications</p>
                  <p className="text-xs text-gray-400">Browser push notifications</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, push: !notifications.push})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.push ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.push ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Market Resolved</p>
                  <p className="text-xs text-gray-400">Notify when markets you bet on resolve</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, marketResolved: !notifications.marketResolved})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.marketResolved ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.marketResolved ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Bet Placed</p>
                  <p className="text-xs text-gray-400">Confirm when your bets are placed</p>
                </div>
                <button
                  onClick={() => setNotifications({...notifications, betPlaced: !notifications.betPlaced})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications.betPlaced ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications.betPlaced ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Privacy & Security</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Show Wallet Address</p>
                  <p className="text-xs text-gray-400">Display your full address publicly</p>
                </div>
                <button
                  onClick={() => setPrivacy({...privacy, showAddress: !privacy.showAddress})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    privacy.showAddress ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    privacy.showAddress ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Show Betting History</p>
                  <p className="text-xs text-gray-400">Allow others to see your betting activity</p>
                </div>
                <button
                  onClick={() => setPrivacy({...privacy, showBets: !privacy.showBets})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    privacy.showBets ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    privacy.showBets ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Show Portfolio Value</p>
                  <p className="text-xs text-gray-400">Display your total portfolio value</p>
                </div>
                <button
                  onClick={() => setPrivacy({...privacy, showPortfolio: !privacy.showPortfolio})}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    privacy.showPortfolio ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    privacy.showPortfolio ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Moon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Appearance</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Theme
                </label>
                <div className="flex gap-3">
                  {['dark', 'light', 'auto'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                        theme === t
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Language & Region */}
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Language & Region</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </div>
          </div>

          {/* Wallet Settings */}
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Wallet Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-white mb-2">Connected Wallet</p>
                <p className="text-xs text-gray-400 mb-4">Manage your wallet connection</p>
                <button className="px-4 py-2 bg-gray-800 text-emerald-400 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
                  Disconnect Wallet
                </button>
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Account</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-white mb-2">Account Actions</p>
                <div className="flex flex-col gap-2">
                  <button className="px-4 py-2 bg-gray-800 text-red-400 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium text-left">
                    Delete Account
                  </button>
                  <button className="px-4 py-2 bg-gray-800 text-emerald-400 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium text-left">
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
