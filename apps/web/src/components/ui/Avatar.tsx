import { ReactNode } from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({ src, alt, fallback, size = 'md', className = '', children }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`
          ${sizeClasses[size]}
          rounded-full object-cover
          border border-outline-variant/20
          ${className}
        `}
      />
    );
  }

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        bg-primary/10 text-primary
        flex items-center justify-center
        font-bold
        border border-outline-variant/20
        ${className}
      `}
    >
      {children ?? (fallback ? fallback[0]?.toUpperCase() : '?')}
    </div>
  );
}
