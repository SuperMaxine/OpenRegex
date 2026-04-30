import React from 'react';

interface LogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon-only' | 'name-only';
  size?: number;
  nameHeight?: number;
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 28,
  nameHeight = 24,
  className = '',
  iconClassName = '',
  nameClassName = ''
}) => {
  const NameText = (
    <img
      src="/logo/name.svg"
      alt="OpenRegex Name"
      style={{ height: `${nameHeight}px` }}
      className={`object-contain ${nameClassName}`}
    />
  );

  switch (variant) {
    case 'icon-only':
      return (
        <div className={`inline-flex items-center justify-center ${className}`}>
          <img src="/logo/logo.svg" alt="OpenRegex Logo" width={size} height={size} className={`object-contain ${iconClassName}`} />
        </div>
      );
    case 'name-only':
      return <div className={`inline-flex items-center justify-center ${className}`}>{NameText}</div>;
    case 'stacked':
      return (
        <div className={`inline-flex flex-col items-center justify-center gap-1.5 ${className}`}>
          <img src="/logo/logo.svg" alt="OpenRegex Logo" className={`object-contain w-3/5 h-auto ${iconClassName}`} />
          {NameText}
        </div>
      );
    case 'horizontal':
    default:
      return (
        <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
          <img src="/logo/logo.svg" alt="OpenRegex Logo" width={size * 2} height={size * 2} className={`object-contain ${iconClassName}`} />
          {NameText}
        </div>
      );
  }
};