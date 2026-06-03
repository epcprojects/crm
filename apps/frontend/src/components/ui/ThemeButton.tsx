// components/ui/Button.tsx

'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type ThemeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primaryGradient' | 'primary' | 'secondary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  fullRounded?: boolean;
  iconBg?: string;
};

export default function ThemeButton({
  children,
  variant = 'primaryGradient',
  size = 'md',
  icon,
  fullRounded = true,
  className,
  iconBg = 'bg-white',
  ...props
}: ThemeButtonProps) {
  const hasIcon = Boolean(icon);
  return (
    <button
      className={clsx(
        'flex items-center cursor-pointer justify-center rounded-lg font-medium transition-all duration-300',

        // Normal button sizes
        !hasIcon && {
          ' px-4 py-2 text-xs': size === 'xs',
          ' px-6 py-3 text-xs': size === 'sm',
          'px-2.5 py-2 text-sm': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },

        // // Button with icon sizes
        hasIcon && {
          ' px-4 py-2 text-xs': size === 'xs',
          ' px-6 py-3 text-xs': size === 'sm',
          'px-2.5 py-2 text-sm': size === 'md',
          'px-6 py-3 text-sm': size === 'lg',
        },

        // Variants
        {
          'bg-linear-to-r from-primary-dark via-[#6719FC]  to-[#3165F6] text-white hover:opacity-90':
            variant === 'primaryGradient',
          'bg-gray-50 border border-gray-200 text-black hover:bg-gray-100':
            variant === 'secondary',
          'bg-primary-dark text-white border border-primary-dark hover:border-primary hover:bg-primary':
            variant === 'primary',
        },
        className,
      )}
      {...props}
    >
      {hasIcon && <span className={clsx('mr-1.5 ')}>{icon}</span>}

      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}
