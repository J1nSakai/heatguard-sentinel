import React from 'react';
import { ReportBlock } from '../../types/api';
import { formatTemp, getBackendRiskLevel } from '../../constants/riskLevels';

interface ThermalTimelineProps {
  blocks: ReportBlock[];
  safestBlockId: number | null;
}

export const ThermalTimeline: React.FC<ThermalTimelineProps> = ({ blocks, safestBlockId }) => {
  if (!blocks || blocks.length === 0) return null;

  // Sort blocks chronologically if they aren't already. Assuming label format "HH:00 - HH:00"
  const sortedBlocks = [...blocks].sort((a, b) => {
    const aHour = parseInt(a.label.split(':')[0], 10);
    const bHour = parseInt(b.label.split(':')[0], 10);
    return aHour - bHour;
  });

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-stone-500 mb-2">
        <span>Daily Thermal Pattern</span>
        <span className="text-stone-400 font-medium tracking-normal normal-case">Average over past 3 days</span>
      </div>
      
      <div className="flex w-full gap-1">
        {sortedBlocks.map((block, idx) => {
          const riskLevel = getBackendRiskLevel(block.avg_temp_c, 38.0); // Assume 38.0 as default high threshold for visual scale
          
          let bgColor = 'bg-stone-200';
          if (riskLevel === 'lower') bgColor = 'bg-emerald-400';
          if (riskLevel === 'moderate') bgColor = 'bg-amber-400';
          if (riskLevel === 'high') bgColor = 'bg-orange-500';
          if (riskLevel === 'very_high') bgColor = 'bg-red-600';

          const isSafest = block.block_id === safestBlockId;

          return (
            <div key={block.block_id} className="group relative flex-1 flex flex-col items-center">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 w-max">
                <div className="bg-stone-800 text-stone-50 text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-xl border border-stone-700">
                  <div className="font-bold">{block.label}</div>
                  <div className="text-stone-300">{formatTemp(block.avg_temp_c, 'C')}</div>
                  {isSafest && <div className="text-emerald-400 mt-0.5 font-semibold">Recommended Safest Time</div>}
                </div>
                <div className="w-2 h-2 bg-stone-800 rotate-45 -mt-1 border-r border-b border-stone-700"></div>
              </div>

              {/* Time Label (Show first, middle, last, or safest to avoid clutter) */}
              {(idx === 0 || idx === sortedBlocks.length - 1 || isSafest) && (
                <span className={`text-[9px] font-mono mb-1 ${isSafest ? 'text-emerald-600 font-bold' : 'text-stone-400'}`}>
                  {block.label.split(' ')[0]}
                </span>
              )}
              {!(idx === 0 || idx === sortedBlocks.length - 1 || isSafest) && (
                <span className="h-[14px] mb-1"></span> // Spacer for alignment
              )}

              {/* Thermal Block */}
              <div 
                className={`w-full h-8 rounded-sm ${bgColor} transition-transform duration-200 hover:scale-y-110 cursor-crosshair border border-black/5 shadow-inner`}
              >
                {isSafest && (
                  <div className="w-full h-full border-2 border-emerald-400 rounded-sm absolute inset-0 mix-blend-multiply"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
