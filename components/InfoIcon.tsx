import React, { useState } from 'react';

interface InfoIconProps {
  tooltip: string;
  className?: string;
}

export default function InfoIcon({ tooltip, className = '' }: InfoIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-600/50 border border-gray-500 text-gray-300 text-xs cursor-help leading-none hover:bg-gray-500/50 hover:border-gray-400 transition-colors ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="flex items-center justify-center w-full h-full font-bold">i</span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-black/95 backdrop-blur-sm text-white text-xs rounded-lg z-50 w-80 border border-gray-600/30 shadow-xl">
          <div className="relative leading-relaxed">{tooltip}</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
        </div>
      )}
    </div>
  );
}
