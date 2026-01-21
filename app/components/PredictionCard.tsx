'use client';

import { useState } from 'react';
import { X, Check, Calendar, TrendingUp } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';

interface PredictionCardProps {
  id: string;
  question: string;
  description?: string;
  image?: string;
  yesProbability: number;
  stakeVolume: number;
  resolveDate: string;
  onSwipe: (direction: 'left' | 'right', id: string) => void;
  defaultAmount?: number | null;
}

export default function PredictionCard({ 
  id, 
  question, 
  description, 
  image,
  yesProbability,
  stakeVolume,
  resolveDate,
  onSwipe, 
  defaultAmount 
}: PredictionCardProps) {
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const noProbability = 100 - yesProbability;

  const handleSwipe = (direction: 'left' | 'right') => {
    setIsExiting(true);
    setTimeout(() => {
      onSwipe(direction, id);
    }, 300);
  };

  const handlers = useSwipeable({
    onSwiping: (e) => {
      setSwipeDelta(e.deltaX);
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) >= 50) {
        handleSwipe('left');
      } else {
        setSwipeDelta(0);
      }
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) >= 50) {
        handleSwipe('right');
      } else {
        setSwipeDelta(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      // Reset if not swiped enough
      if (Math.abs(swipeDelta) < 50) {
        setSwipeDelta(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
    delta: 30,
  });

  const rotation = swipeDelta * 0.1;
  const opacity = 1 - Math.abs(swipeDelta) / 500;

  return (
    <div
      {...handlers}
      className="relative w-full bg-slate-700/30 border border-emerald-500/20 rounded-xl shadow-lg overflow-hidden select-none transition-transform duration-200 ease-out backdrop-blur-sm"
      style={{
        transform: `translateX(${swipeDelta}px) rotate(${rotation}deg)`,
        opacity: isExiting ? 0 : Math.max(0.3, opacity),
        zIndex: isExiting ? 0 : 1,
      }}
    >
      {/* Swipe indicators */}
      {swipeDelta > 50 && (
        <div className="absolute inset-0 bg-emerald-400/20 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-emerald-400 text-white px-6 py-3 rounded-lg font-bold text-xl shadow-lg">
            YES
          </div>
        </div>
      )}
      {swipeDelta < -50 && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold text-xl shadow-lg">
            NO
          </div>
        </div>
      )}

      <div className="p-3 md:p-4">
        {/* Header with image and probability */}
        <div className="flex items-start gap-3 mb-3">
          {/* Small square image */}
          {image && (
            <div className="flex-shrink-0">
              <img
                src={image}
                alt={question}
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover border border-emerald-500/30"
              />
            </div>
          )}
          
          {/* Probability bars - Polymarket style */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400">YES</span>
                <span className="text-lg font-bold text-emerald-400">{yesProbability}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{noProbability}%</span>
                <span className="text-xs font-semibold text-red-500">NO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question and Description */}
        <div className="space-y-1.5 mb-2">
          <h2 className="text-base md:text-lg font-semibold text-white leading-tight">{question}</h2>
          {description && (
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
            <span>{stakeVolume.toFixed(1)} STRK</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Resolves {formatDate(resolveDate)}</span>
          </div>
        </div>
        
        {/* Desktop buttons - inside card */}
        <div className="hidden md:flex justify-center gap-3 pt-3 border-t border-emerald-500/30">
          <button
            onClick={() => handleSwipe('left')}
            disabled={!defaultAmount || defaultAmount <= 0}
            className="flex-1 px-4 py-2.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg font-semibold hover:bg-red-500/30 transition-all flex items-center justify-center text-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            No
          </button>
          <button
            onClick={() => handleSwipe('right')}
            disabled={!defaultAmount || defaultAmount <= 0}
            className="flex-1 px-4 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-semibold hover:bg-emerald-500/30 transition-all flex items-center justify-center text-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Yes
          </button>
        </div>

        {/* Mobile hint */}
        <div className="md:hidden text-center pt-2 border-t border-emerald-500/30">
          <p className="text-xs text-gray-400">Swipe left for No, right for Yes</p>
        </div>
      </div>
    </div>
  );
}
