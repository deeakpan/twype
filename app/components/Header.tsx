'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Wallet, Search, Info, Plus, Settings, ChevronDown } from 'lucide-react';
import { useStarknetWallet } from './WalletProvider';
import SettingsModal from './SettingsModal';
import { STRKToken } from '../lib/strk-token';

export default function Header() {
  const { isConnected, address, connect, account } = useStarknetWallet();
  const [activeTab, setActiveTab] = useState('markets');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    // Load avatar from localStorage
    const savedAvatar = localStorage.getItem('penkmarket_avatar');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  // Fetch STRK balance when connected
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

  const tabs = ['Markets', 'Portfolio'];

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/20 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Menu Icon - Left */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Twype Text - Center */}
          <Link href="/" className="text-lg font-black text-white tracking-tight hover:text-gray-200 transition-colors flex items-center gap-1.5" style={{ fontFamily: 'var(--font-brand)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
              <rect x="4" y="6" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M8 10L10 12L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M16 10L14 12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M2 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Twype</span>
          </Link>

          {/* Right side - Avatar (connected) or Settings (not connected) */}
          {isConnected ? (
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-2.5 py-2 bg-slate-700/30 border border-emerald-500/20 rounded-full hover:bg-slate-600/30 transition-colors"
            >
              <img
                src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (address || 'default')}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover shadow-lg"
              />
              <ChevronDown className="w-3 h-3 text-emerald-400" />
            </button>
          ) : (
            <button
              onMouseEnter={() => setSettingsModalOpen(true)}
              className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-emerald-400" />
            </button>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <div className="mt-3 pt-3 border-t border-black/20">
            <div className="flex flex-col gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab.toLowerCase());
                    setMenuOpen(false);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                    activeTab === tab.toLowerCase()
                      ? 'bg-emerald-500 text-white'
                      : 'text-emerald-400 hover:bg-gray-900 hover:text-emerald-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
              <div className="pt-2 border-t border-black/20">
                <Link
                  href="/create"
                  className="w-full text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium mb-2"
                >
                  Create Market
                </Link>
                {!isConnected && (
                  <button
                    onClick={() => {
                      setSettingsModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-emerald-400 hover:bg-gray-900 rounded-lg transition-colors text-sm font-medium mb-2"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                )}
                {isConnected ? (
                  <button
                    onClick={() => {
                      setSettingsModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3"
                  >
                    <img
                      src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (address || 'default')}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover shadow-lg"
                    />
                    <span className="text-sm font-medium text-emerald-300">
                      {formatAddress(address)}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={connect}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header - Left Aligned */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/20">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left Section: Logo and Tabs */}
            <div className="flex items-center gap-6">
              <Link href="/" className="text-2xl font-black text-white tracking-tight hover:text-gray-200 transition-colors cursor-pointer flex items-center gap-2" style={{ fontFamily: 'var(--font-brand)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <rect x="4" y="6" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M8 10L10 12L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M16 10L14 12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <path d="M2 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M20 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Twype</span>
              </Link>
              
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.toLowerCase()
                        ? 'bg-emerald-500 text-white'
                        : 'text-emerald-400 hover:bg-gray-900 hover:text-emerald-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Center Section: Search and Filters */}
            <div className="flex items-center gap-2 -ml-2">
              {/* Search Bar */}
              <div className="relative w-[500px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400/70" />
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-emerald-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>

              {/* How it works Button */}
              <button className="px-3 py-2 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span className="text-sm font-medium">How it works</span>
              </button>

              {/* STRK Balance (only when connected) */}
              {isConnected && balance !== null && (
                <div className="px-3 py-2 text-emerald-300 text-base font-semibold font-mono">
                  {balance.toFixed(4)} STRK
                </div>
              )}
            </div>

            {/* Right Section: Create Market, Settings (if not connected), and Avatar/Connect */}
            <div className="flex-shrink-0 flex items-center gap-6">
              <Link
                href="/create"
                className="px-4 py-2 text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-light italic border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10"
              >
                Create Market
              </Link>
              {/* Settings Icon (only when not connected) */}
              {!isConnected && (
                <div 
                  className="relative"
                  onMouseEnter={() => setSettingsModalOpen(true)}
                  onMouseLeave={() => {
                    setTimeout(() => {}, 100);
                  }}
                >
                  <button
                    className="p-2 text-emerald-400 hover:bg-gray-900 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              )}
              {/* Avatar (only when connected) */}
              {isConnected ? (
                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/30 border border-emerald-500/20 rounded-full hover:bg-slate-600/30 transition-colors"
                  title="Settings"
                >
                  <img
                    src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (address || 'default')}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover shadow-lg"
                  />
                  <ChevronDown className="w-4 h-4 text-emerald-400" />
                </button>
              ) : (
                <button
                  onClick={connect}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  <Wallet className="w-4 h-4" />
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
      />
    </>
  );
}
