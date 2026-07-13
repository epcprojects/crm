import Image from 'next/image';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  imageUrl?: string;
  imageAlt?: string;
  title?: string;
  description?: string;
  button?: ReactNode;
};

export default function EmptyState({
  imageUrl,
  imageAlt = 'Empty state',
  title,
  description,
  button,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      {imageUrl ? (
        <Image
          src={imageUrl}
          width={124}
          height={124}
          alt={imageAlt}
        />
      ) : null}

      {title || description ? (
        <div className="flex flex-col items-center gap-1">
          {title ? (
            <p className="text-lg font-medium text-gray-700">{title}</p>
          ) : null}

          {description ? (
            <p className="text-xs text-gray-700">{description}</p>
          ) : null}
        </div>
      ) : null}

      {button ? <div className="mt-1">{button}</div> : null}
    </div>
  );
}