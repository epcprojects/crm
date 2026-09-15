'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type ThemeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primaryGradient' | 'primary' | 'secondary' | 'black';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconBg?: string;
  borderclassName?: string;
};

export default function ThemeButton({
  children,
  variant = 'primaryGradient',
  size = 'md',
  icon,
  className,
  iconBg = 'bg-white',
  borderclassName,
  ...props
}: ThemeButtonProps) {
  const hasIcon = Boolean(icon);
  return (
    <button
      className={clsx(
        className,
        {
          'bg-[#673DE6] text-white hover:bg-[#542ad4]':
            variant === 'primaryGradient',
          'bg-white border border-[#D4D4D4] text-black hover:bg-gray-100 drop-shadow-xs':
            variant === 'secondary',
          'bg-primary-dark text-white border border-primary-dark hover:border-primary hover:bg-primary':
            variant === 'primary',
        },
        // {
        //   'py-2 px-4 text-[15px] gap-1.5': size === 'md',
        //   'py-1.75 px-3 text-[13px] gap-1': size === 'sm',
        // },
        size === 'sm'
          ? 'py-1.75 px-3 text-[13px] gap-1'
          : 'py-2 px-4 text-[15px] gap-1.5',
        'rounded-lg  flex items-center justify-center  font-medium  transition-all duration-300 ease-in-out',
      )}
      {...props}
    >
      {hasIcon && <span>{icon}</span>}

      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}
