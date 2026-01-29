'use client';

import Link from 'next/link';
import { Wallet, Plus, Settings } from 'lucide-react';
import { useStarknetWallet } from './WalletProvider';
import SettingsModal from './SettingsModal';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Header() {
  const { isConnected, address, connect, account } = useStarknetWallet();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const savedAvatar = localStorage.getItem('penkmarket_avatar');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  return (
    <>
      {/* Floating Header Elements */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        {/* Mobile Layout: Left (Create) | Center (Branding) | Right (Connect/Avatar) */}
        <div className="md:hidden flex items-center justify-between px-3 py-3 pointer-events-auto">
          {/* Left: Create Market Text */}
          <Link
            href="/create"
            className="text-emerald-400 hover:text-emerald-300 transition-colors text-xs font-medium"
          >
            Create
          </Link>

          {/* Center: Branding with Logo */}
          <Link 
            href="/" 
            className="text-lg font-black text-white tracking-tight hover:text-gray-200 transition-colors flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            <img 
              src="/twype-logo.png" 
              alt="Twype Logo" 
              className="w-6 h-6 object-contain"
            />
            <span>Twype</span>
          </Link>

          {/* Right: Connect/Avatar */}
          {isConnected ? (
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-700/30 border border-emerald-500/20 rounded-full hover:bg-slate-600/30 transition-colors"
            >
              <img
                src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (address || 'default')}
                alt="Avatar"
                className="w-6 h-6 rounded-full object-cover shadow-lg"
              />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 bg-slate-700/20 border border-emerald-500/15 rounded-lg text-emerald-300 hover:bg-slate-700/30 hover:border-emerald-500/25 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={connect}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-xs font-medium"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Layout: Left (Branding) | Right (Create + Connect/Avatar) */}
        <div className="hidden md:block">
          {/* Branding - Top Left */}
          <Link 
            href="/" 
            className="absolute top-6 left-6 pointer-events-auto text-2xl font-black text-white tracking-tight hover:text-gray-200 transition-colors flex items-center gap-2"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            <img 
              src="/twype-logo.png" 
              alt="Twype Logo" 
              className="w-10 h-10 object-contain"
            />
            <span>Twype</span>
          </Link>

          {/* Right Side Actions - Top Right */}
          <div className="absolute top-6 right-6 flex items-center gap-4 pointer-events-auto">
            {/* Create Market Text */}
            <Link
              href="/create"
              className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium"
            >
              Create Market
            </Link>

            {/* Connect Button / Avatar / Settings */}
            {isConnected ? (
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/30 border border-emerald-500/20 rounded-full hover:bg-slate-600/30 transition-colors"
              >
                <img
                  src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (address || 'default')}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover shadow-lg"
                />
                <ChevronDown className="w-4 h-4 text-emerald-400" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="p-2.5 bg-slate-700/20 border border-emerald-500/15 rounded-lg text-emerald-300 hover:bg-slate-700/30 hover:border-emerald-500/25 transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={connect}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect</span>
                </button>
              </div>
            )}
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
