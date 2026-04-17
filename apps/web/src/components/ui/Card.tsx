import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
}

const variantClasses = {
  default: 'bg-surface-container-low rounded-xl shadow-sm',
  elevated: 'bg-surface-container-lowest rounded-xl shadow-[0px_32px_32px_rgba(11,30,38,0.04)]',
  outlined: 'bg-surface-container-low rounded-xl border border-outline-variant/10',
};

export function Card({ children, className = '', onClick, variant = 'default' }: CardProps) {
  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${onClick ? 'cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-4 border-b border-outline-variant/10 ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children?: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`p-4 border-t border-outline-variant/10 ${className}`}>
      {children}
    </div>
  );
}
