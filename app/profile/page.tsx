'use client';

import { useState, useEffect } from 'react';
import { useStarknetWallet } from '../components/WalletProvider';
import Header from '../components/Header';
import { User, LogOut, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { isConnected, address, disconnect } = useStarknetWallet();
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  useEffect(() => {
    // Load saved profile data
    const savedUsername = localStorage.getItem('penkmarket_username');
    const savedBio = localStorage.getItem('penkmarket_bio');
    if (savedUsername) setUsername(savedUsername);
    if (savedBio) setBio(savedBio);
  }, []);

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleSave = () => {
    localStorage.setItem('penkmarket_username', username);
    localStorage.setItem('penkmarket_bio', bio);
    setSaveMessage('Profile saved!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleDisconnect = async () => {
    await disconnect();
    router.push('/');
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20 md:pb-32">
      <Header />

      <div className="w-full px-4 pt-24 md:pt-32 max-w-2xl mx-auto">
        <div className="bg-slate-700/30 border border-emerald-500/20 rounded-xl shadow-lg overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="p-6 border-b border-emerald-500/20">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={localStorage.getItem('penkmarket_avatar') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (address || 'default')}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-emerald-400">Edit Profile</h1>
                <p className="text-sm text-slate-400">{formatAddress(address)}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">
                Username
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Choose a username to display instead of your wallet address
              </p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-2 bg-slate-600/30 border border-emerald-500/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-emerald-400 mb-2">
                Bio
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Tell others about yourself
              </p>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a bio..."
                rows={4}
                className="w-full px-4 py-2 bg-slate-600/30 border border-emerald-500/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent resize-none"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Save Profile
              </button>
              {saveMessage && (
                <span className="text-sm text-emerald-400">{saveMessage}</span>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-emerald-500/20 pt-6">
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-6 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
