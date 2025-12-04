interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export default function Logo({
  size = 60,
  showWordmark = true,
  variant = 'dark',
  className = ''
}: LogoProps) {
  // Updated to match new Design System: Pure White or Deep Slate
  const fillColor = variant === 'light' ? '#FFFFFF' : '#0F172A';

  return (
    <div className={`logo-component ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-symbol"
        style={{ transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Main abstract symbol: More stable, less chaotic layers */}
        {/* Layer 1: Foundation */}
        <path d="M20 70 L50 40 L80 70 L50 85 Z" fill={fillColor} opacity="0.4"/>

        {/* Layer 2: Core */}
        <path d="M15 50 L50 20 L85 50 L50 65 Z" fill={fillColor} opacity="0.7"/>

        {/* Layer 3: Focus (Solid) */}
        <path d="M25 45 L50 25 L75 45 L50 58 Z" fill={fillColor} opacity="1.0"/>

        {/* Central accent point */}
        <circle cx="50" cy="42" r="3.5" fill={fillColor}/>
      </svg>

      {showWordmark && (
        <div
          className="logo-wordmark"
          style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: `${size * 0.4}px`,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: fillColor,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'baseline'
          }}
        >
          Clipping<span style={{ 
            color: variant === 'light' ? '#94A3B8' : '#64748B', // Slate-400/500
            fontWeight: 400,
            fontFamily: "'Inter', sans-serif", // Mix font for .AI to look modern
            fontSize: '0.8em',
            marginLeft: '2px'
          }}>.AI</span>
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
