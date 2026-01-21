'use client';

import { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, FileText, Shield, ExternalLink, Copy, Check, LogOut, User, Pencil } from 'lucide-react';
import { useStarknetWallet } from './WalletProvider';
import Link from 'next/link';

const DEFAULT_AMOUNT_KEY = 'penkmarket_default_amount';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { isConnected, address, disconnect } = useStarknetWallet();
  const [defaultAmount, setDefaultAmount] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [isHovering, setIsHovering] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('deezatrd3');
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load avatar from localStorage
    const savedAvatar = localStorage.getItem('penkmarket_avatar');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
    // Load username from localStorage
    const savedUsername = localStorage.getItem('penkmarket_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  // Load current default amount
  useEffect(() => {
    if (isOpen) {
      const savedDefault = localStorage.getItem(DEFAULT_AMOUNT_KEY);
      if (savedDefault) {
        setDefaultAmount(savedDefault);
      }
      // Focus and select input when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen]);

  const handleSave = () => {
    const amount = parseFloat(defaultAmount);
    if (isNaN(amount) || amount <= 0) {
      setSaveMessage('Please enter a valid amount');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    localStorage.setItem(DEFAULT_AMOUNT_KEY, defaultAmount);
    setSaveMessage('Saved!');
    setTimeout(() => {
      setSaveMessage('');
      onClose();
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    // Add a delay before closing to allow moving mouse to modal
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 300);
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-4 pointer-events-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Modal - positioned near settings icon */}
      <div 
        className="relative bg-slate-700/30 border border-emerald-500/20 rounded-lg shadow-xl w-72 pointer-events-auto backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-emerald-500/20">
          <h2 className="text-lg font-bold text-emerald-400">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-600/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-4">
          {/* Avatar and Address Section (only when connected) */}
          {isConnected && address && (
            <>
              <div className="flex items-center gap-3 pb-3 border-b border-emerald-500/20">
                <img
                  src={avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (address || 'default')}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover shadow-lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-emerald-300">{username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{formatAddress(address)}</span>
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:bg-slate-600/30 rounded transition-colors"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-emerald-400" />
                      )}
                    </button>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="p-2 hover:bg-slate-600/30 rounded-lg transition-colors"
                  title="Edit profile"
                >
                  <Pencil className="w-4 h-4 text-emerald-400" />
                </Link>
              </div>
            </>
          )}

          {/* Default Bet Amount */}
          <div>
            <label className="block text-xs font-medium text-emerald-400 mb-1.5">
              Default Bet Amount (STRK)
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Used for every "Yes" swipe
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="number"
                step="0.1"
                min="0"
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.0"
                className="flex-1 px-2 py-1 text-xs bg-slate-600/30 border border-emerald-500/20 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-transparent"
              />
              <button
                onClick={handleSave}
                className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 transition-colors font-medium"
              >
                Save
              </button>
            </div>
            {saveMessage && (
              <p className={`mt-1.5 text-xs ${
                saveMessage === 'Saved!' ? 'text-green-400' : 'text-red-400'
              }`}>
                {saveMessage}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-emerald-500/20"></div>

          {/* Links */}
          <div className="space-y-1">
            {isConnected && (
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-300 hover:text-emerald-400 hover:bg-slate-600/30 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Edit Profile</span>
              </Link>
            )}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.open('mailto:support@twype.com', '_blank');
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-300 hover:text-emerald-400 hover:bg-slate-600/30 rounded-lg transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Support</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.open('https://docs.twype.com', '_blank');
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-300 hover:text-emerald-400 hover:bg-slate-600/30 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Documentation</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.open('/terms', '_blank');
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-300 hover:text-emerald-400 hover:bg-slate-600/30 rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Terms of Use</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </a>
            {isConnected && (
              <button
                onClick={async () => {
                  await disconnect();
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-red-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
