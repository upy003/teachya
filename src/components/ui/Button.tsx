import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40 border border-violet-500/30',
  secondary:
    'bg-white/10 hover:bg-white/20 text-white border border-white/15',
  ghost:
    'bg-transparent hover:bg-white/10 text-white/70 hover:text-white',
  danger:
    'bg-red-600/80 hover:bg-red-500 text-white border border-red-500/30',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-10 w-10 p-0',
};

/** Reusable button with variants, sizes, and motion press feedback */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.1 }}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center rounded-xl font-medium',
          'transition-colors duration-150 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-violet-500/80',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          icon
        )}
        {children}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
