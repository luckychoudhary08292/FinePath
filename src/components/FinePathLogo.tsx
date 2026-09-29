import React from 'react';

interface Props {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const FinePathLogo: React.FC<Props> = ({
  className = '',
  size = 40,
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform group-hover:scale-105"
      >
        <defs>
          <linearGradient id="fpBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#050C1A" />
            <stop offset="100%" stopColor="#0A182E" />
          </linearGradient>
          <linearGradient id="fpBar1" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1565C0" />
            <stop offset="100%" stopColor="#29B6F6" />
          </linearGradient>
          <linearGradient id="fpBar2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0288D1" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>
          <linearGradient id="fpBar3" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00897B" />
            <stop offset="100%" stopColor="#00E676" />
          </linearGradient>
          <linearGradient id="fpBar4" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#69F0AE" />
          </linearGradient>
          <linearGradient id="fpArrow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0091EA" />
            <stop offset="50%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#00FF85" />
          </linearGradient>
        </defs>

        {/* Rounded square container */}
        <rect width="120" height="120" rx="28" fill="url(#fpBg)" />
        <rect x="2" y="2" width="116" height="116" rx="26" stroke="#00E5FF" strokeOpacity={0.2} strokeWidth={1.5} />

        {/* 4 growth bars */}
        <rect x="35" y="55" width="8" height="24" rx="2" fill="url(#fpBar1)" />
        <rect x="46" y="46" width="8" height="33" rx="2" fill="url(#fpBar2)" />
        <rect x="57" y="38" width="8" height="41" rx="2" fill="url(#fpBar3)" />
        <rect x="68" y="30" width="8" height="49" rx="2" fill="url(#fpBar4)" />

        {/* Twin financial seed leaves */}
        <path d="M 46 80 C 46 73 54 71 58 71 C 58 78 50 81 46 80 Z" fill="#050C1A" stroke="#00E5FF" strokeWidth={2} />
        <path d="M 68 80 C 68 73 60 71 56 71 C 56 78 64 81 68 80 Z" fill="#050C1A" stroke="#00E5FF" strokeWidth={2} />

        {/* Ascending Arrow Path */}
        <path d="M 28 80 L 46 80" stroke="#00E5FF" strokeWidth={2} strokeLinecap="round" />
        <path d="M 28 80 L 36 70" stroke="#00E5FF" strokeWidth={2} strokeLinecap="round" />
        <path d="M 28 80 L 51 46 L 58 56 L 82 24" fill="none" stroke="url(#fpArrow)" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Dynamic Arrow Head */}
        <polygon points="76,23 88,20 85,32 81,28 78,31 75,28 78,24" fill="#00FF85" stroke="#050C1A" strokeWidth={1} />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-black text-lg tracking-wider text-white leading-tight font-sans">
            FINEPATH
          </span>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#00E5FF] leading-none">
            MONEY MANAGEMENT
          </span>
        </div>
      )}
    </div>
  );
};
