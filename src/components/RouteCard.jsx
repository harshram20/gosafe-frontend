import React from 'react';
import { Shield, Navigation, AlertTriangle, Lightbulb, Store, Users, Car, Check } from 'lucide-react';

const RouteCard = ({ route, index, isSelected, onClick }) => {
  const { 
    name, 
    distance, 
    duration, 
    safetyRating, 
    shopsCount, 
    crowdLevel, 
    trafficLevel, 
    lightingLevel 
  } = route;

  // Determine safety color badge
  const getSafetyBadgeStyle = (rating) => {
    if (rating >= 8) return 'bg-emerald-950/40 border-emerald-900/40 text-emerald-400';
    if (rating >= 5) return 'bg-yellow-950/40 border-yellow-900/40 text-yellow-400';
    return 'bg-red-950/40 border-red-900/40 text-red-400';
  };

  // Helper for progress bar color
  const getRatingColor = (rating) => {
    if (rating >= 8) return 'bg-emerald-500';
    if (rating >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl cursor-pointer transition-all border duration-200 relative ${
        isSelected 
          ? 'bg-neutral-900/80 border-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/20 text-white' 
          : 'bg-neutral-950/40 border-neutral-850 hover:border-neutral-750 hover:bg-neutral-900/35 text-neutral-450'
      }`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 bg-white text-black rounded-full p-1 shadow-sm">
          <Check className="w-3.5 h-3.5 stroke-3" />
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-450">
            Route Option {index + 1}
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">{name}</h3>
        </div>
        
        <span className={`px-2.5 py-1 text-[11px] font-bold border rounded-full ${getSafetyBadgeStyle(safetyRating)}`}>
          Safety: {safetyRating}/10
        </span>
      </div>

      {/* Safety Score progress bar */}
      <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden mb-4 border border-neutral-850">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getRatingColor(safetyRating)}`}
          style={{ width: `${safetyRating * 10}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-neutral-300 text-xs">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-neutral-450 shrink-0" />
          <span>{distance.toFixed(1)} km</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5 text-neutral-450 shrink-0" />
          <span>{Math.round(duration)} mins</span>
        </div>

        <div className="flex items-center gap-1.5 col-span-2 border-t border-neutral-850 pt-2 mt-1"></div>

        <div className="flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-sky-450 shrink-0" />
          <span>{shopsCount} shops near</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-450 shrink-0" />
          <span>{lightingLevel} lighting</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-pink-450 shrink-0" />
          <span>{crowdLevel} crowd</span>
        </div>

        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-450 shrink-0" />
          <span>{trafficLevel} traffic</span>
        </div>
      </div>
    </div>
  );
};

export default RouteCard;