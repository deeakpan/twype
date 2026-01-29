'use client';

import { useState } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
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
      className="relative w-full bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-emerald-500/25 rounded-xl shadow-lg overflow-hidden select-none transition-all duration-200 ease-out backdrop-blur-sm hover:border-emerald-500/45 hover:shadow-emerald-500/15"
      style={{
        transform: `translateX(${swipeDelta}px) rotate(${rotation}deg)`,
        opacity: isExiting ? 0 : Math.max(0.3, opacity),
        zIndex: isExiting ? 0 : 1,
      }}
    >
      {/* Swipe indicators */}
      {swipeDelta > 50 && (
        <div className="absolute inset-0 bg-emerald-400/20 flex items-center justify-center z-10 pointer-events-none backdrop-blur-sm">
          <div className="bg-emerald-400 text-white px-8 py-4 rounded-xl font-bold text-2xl shadow-2xl">
            YES
          </div>
        </div>
      )}
      {swipeDelta < -50 && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10 pointer-events-none backdrop-blur-sm">
          <div className="bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-2xl shadow-2xl">
            NO
          </div>
        </div>
      )}

      <div className="p-3">
        {/* Top Section: Image and Probability */}
        <div className="flex items-start gap-2.5 mb-2.5">
          {/* Image */}
          {image && (
            <div className="flex-shrink-0">
              <img
                src={image}
                alt={question}
                className="w-10 h-10 md:w-14 md:h-14 rounded-lg object-cover border border-emerald-500/25 shadow-md"
              />
            </div>
          )}
          
          {/* Probability Display */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-center">
                <div className="text-[10px] font-semibold text-emerald-400 mb-0.5">YES</div>
                <div className="text-xl md:text-2xl font-bold text-emerald-400">{yesProbability}%</div>
              </div>
              <div className="h-8 w-px bg-emerald-500/25"></div>
              <div className="text-center">
                <div className="text-[10px] font-semibold text-red-400 mb-0.5">NO</div>
                <div className="text-xl md:text-2xl font-bold text-white">{noProbability}%</div>
              </div>
            </div>
            
            {/* Probability Bar */}
            <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${yesProbability}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question and Description */}
        <div className="space-y-1 mb-2.5">
          <h2 className="text-sm md:text-base font-bold text-white leading-tight">{question}</h2>
          {description && (
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{description}</p>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-2.5 pb-2.5 border-b border-emerald-500/15">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-semibold">{stakeVolume.toFixed(1)} STRK</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Resolves {formatDate(resolveDate)}</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSwipe('left')}
            disabled={!defaultAmount || defaultAmount <= 0}
            className="flex-1 px-2.5 py-2 bg-red-500/15 text-red-200 border border-red-500/30 rounded-lg font-semibold text-xs hover:bg-red-500/25 hover:border-red-500/45 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500/15 disabled:hover:border-red-500/30"
          >
            No
          </button>
          <button
            onClick={() => handleSwipe('right')}
            disabled={!defaultAmount || defaultAmount <= 0}
            className="flex-1 px-2.5 py-2 bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 rounded-lg font-semibold text-xs hover:bg-emerald-500/25 hover:border-emerald-500/45 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/15 disabled:hover:border-emerald-500/30"
          >
            Yes
          </button>
        </div>

        {/* Mobile swipe hint */}
        <div className="md:hidden text-center pt-4 mt-4 border-t border-emerald-500/20">
          <p className="text-xs text-gray-400">Swipe left for No, right for Yes</p>
        </div>
      </div>
    </div>
  );
}
