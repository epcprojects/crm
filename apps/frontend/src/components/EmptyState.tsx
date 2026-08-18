"use client"
import Image from 'next/image';
import type { ReactNode } from 'react';
import ThemeButton from './ui/ThemeButton';
import { PlusIcon } from '../../public/icons';
import { useIsMobile } from './hooks/useIsMobile';

type EmptyStateProps = {
  imageUrl?: string;
  imageAlt?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonIcon?: ReactNode;
  onButtonClick?: () => void;
};

export default function EmptyState({
  imageUrl,
  imageAlt = 'Empty state',
  title,
  description,
  buttonLabel,
  buttonIcon,
  onButtonClick,
}: EmptyStateProps) {
  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col flex-1 h-full justify-center items-center gap-1.5 md:gap-3 py-2 md:py-4 text-center">
      {imageUrl ? (
        <Image src={imageUrl} width={isMobile?70:110} height={isMobile?70:110} alt={imageAlt} />
      ) : null}

      {title || description ? (
        <div className="flex flex-col items-center gap-1">
          {title ? (
            <p className="text-base md:text-lg font-medium text-gray-800">{title}</p>
          ) : null}

          {description ? (
            <p className="text-xs text-gray-700">{description}</p>
          ) : null}
        </div>
      ) : null}

      {buttonLabel && onButtonClick ? (
        <ThemeButton
          className="mt-1 rounded-full"
          variant="primaryGradient"
          icon={buttonIcon}
          onClick={onButtonClick}
        >
          {buttonLabel}
        </ThemeButton>
      ) : null}
    </div>
  );
}
