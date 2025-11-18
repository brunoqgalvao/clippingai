import React from 'react';

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export default function Logo({
  size = 60,
  showWordmark = true,
  variant = 'light',
  className = ''
}: LogoProps) {
  const fillColor = variant === 'light' ? '#FAFAFA' : '#0A0A0A';

  return (
    <div className={`logo-component ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-symbol"
        style={{ transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Main abstract symbol: Three overlapping angular planes representing data convergence */}
        {/* Plane 1: Bottom layer */}
        <path d="M20 70 L50 40 L80 70 L50 85 Z" fill={fillColor} opacity="0.3"/>

        {/* Plane 2: Middle layer (offset) */}
        <path d="M15 50 L50 20 L85 50 L50 65 Z" fill={fillColor} opacity="0.5"/>

        {/* Plane 3: Top layer (main focus) */}
        <path d="M25 45 L50 25 L75 45 L50 58 Z" fill={fillColor} opacity="0.9"/>

        {/* Central accent point - the convergence */}
        <circle cx="50" cy="42" r="4" fill={fillColor}/>

        {/* Subtle connecting lines suggesting data flow */}
        <line x1="50" y1="25" x2="50" y2="15" stroke={fillColor} strokeWidth="1.5" opacity="0.4" strokeLinecap="round"/>
        <line x1="50" y1="58" x2="50" y2="68" stroke={fillColor} strokeWidth="1.5" opacity="0.4" strokeLinecap="round"/>
      </svg>

      {showWordmark && (
        <div
          className="logo-wordmark"
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: `${size * 0.4}px`,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: fillColor,
            lineHeight: 1
          }}
        >
          Clipping<span style={{ color: variant === 'light' ? '#9A9A9A' : '#4A4A4A', fontWeight: 600 }}>.AI</span>
        </div>
      )}
    </div>
  );
}

// Additional export for just the symbol
export function LogoSymbol({
  size = 40,
  variant = 'light',
  className = ''
}: Omit<LogoProps, 'showWordmark'>) {
  return <Logo size={size} showWordmark={false} variant={variant} className={className} />;
}
