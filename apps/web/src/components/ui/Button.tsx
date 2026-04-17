import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-primary to-primary-container text-white shadow-md hover:opacity-90',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  outline: 'border border-primary text-primary hover:bg-primary/5',
  ghost: 'text-primary hover:bg-primary/5',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-14 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          font-semibold rounded-lg
          transition-all duration-200
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="material-symbols-outlined animate-spin">sync</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
