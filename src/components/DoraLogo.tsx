import React from "react";

interface DoraLogoProps {
  size?: number;
  className?: string;
}

export const DoraLogo: React.FC<DoraLogoProps> = ({ size = 42, className = "" }) => {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <div
        className="absolute inset-0 rounded-2xl bg-[#1677FF] opacity-30 blur-md pointer-events-none"
        style={{ width: size, height: size }}
      />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="doraLogoGrad" x1="10%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#48A8FF" />
            <stop offset="45%" stopColor="#2388FF" />
            <stop offset="100%" stopColor="#0B4FFF" />
          </linearGradient>
          <linearGradient id="doraInnerGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#93C5FD" />
          </linearGradient>
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer stylized futuristic "D" shape */}
        <path
          d="M 22 18 C 22 15 25 12 29 12 L 56 12 C 76 12 88 24 88 50 C 88 76 76 88 56 88 L 29 88 C 25 88 22 85 22 82 Z"
          fill="url(#doraLogoGrad)"
          filter="url(#logoGlow)"
        />

        {/* Inner negative space cutout of "D" */}
        <path
          d="M 38 28 L 54 28 C 66 28 72 36 72 50 C 72 64 66 72 54 72 L 38 72 Z"
          fill="#050914"
        />

        {/* Futuristic diagonal slice highlight in the spine */}
        <path
          d="M 22 42 L 38 34 L 38 52 L 22 58 Z"
          fill="url(#doraInnerGrad)"
          opacity="0.85"
        />

        {/* Sparkle / Four-pointed star at the top-left */}
        <g transform="translate(14, 6)">
          <path
            d="M 8 0 Q 8 8 16 8 Q 8 8 8 16 Q 8 8 0 8 Q 8 8 8 0 Z"
            fill="#E0F2FE"
            filter="drop-shadow(0 0 3px #60A5FA)"
          />
        </g>
      </svg>
    </div>
  );
};
