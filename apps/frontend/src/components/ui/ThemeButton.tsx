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
  borderclassName?: string;
};

export default function ThemeButton({
  children,
  variant = 'primaryGradient',
  size = 'md',
  icon,
  fullRounded = true,
  className,
  iconBg = 'bg-white',
  borderclassName,
  ...props
}: ThemeButtonProps) {
  const hasIcon = Boolean(icon);
  return (
    <button
      className={clsx(
        `flex items-center cursor-pointer justify-center ${borderclassName} ${fullRounded?"rounded-full":"rounded-lg"}  font-medium transition-all duration-300`,
        !hasIcon && {
          ' px-4 py-2 text-xs': size === 'xs',
          ' px-6 py-3 text-xs': size === 'sm',
          'px-2.5 py-2 text-base': size === 'md',
          'px-6 py-2.5 text-sm md:text-base': size === 'lg',
        },
        hasIcon && {
          ' px-4 py-2 text-xs': size === 'xs',
          ' px-6 py-3 text-xs': size === 'sm',
          'px-2.5 py-2 text-base': size === 'md',
          'px-6 py-2.5 text-sm md:text-base': size === 'lg',
        },
        {
          'bg-linear-to-l from-royal-blue  to-crystal-blue text-white hover:opacity-90':
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
      {hasIcon && <span className={clsx('mr-1.5 w-8 h-8 bg-white shrink-0 rounded-full flex items-center justify-center')}>{icon}</span>}

      <span className="whitespace-nowrap font-medium">{children}</span>
    </button>
  );
}
