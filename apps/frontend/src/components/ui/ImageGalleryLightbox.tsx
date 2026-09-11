'use client';

// eslint-disable-next-line @nx/enforce-module-boundaries
import { DownloadIcon } from 'apps/frontend/public/icons';
import { useEffect, useState } from 'react';

type GalleryImage = {
  mediaType?: 'image' | 'video';
  storageKey?: string;
  fileName?: string;
  src: string;
  alt: string;
};

type ImageGalleryLightboxProps = {
  images: GalleryImage[];
  activeIndex: number | null;
  title: string;
  onClose: () => void;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export default function ImageGalleryLightbox({
  images,
  activeIndex,
  title,
  onClose,
  onSelect,
  onPrevious,
  onNext,
}: ImageGalleryLightboxProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      // Let the video controls handle arrow keys for seeking and volume.
      if (event.target instanceof HTMLVideoElement) return;
      if (event.key === 'ArrowLeft') onPrevious();
      if (event.key === 'ArrowRight') onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeIndex, onClose, onNext, onPrevious]);

  if (activeIndex === null || !images[activeIndex]) {
    return null;
  }

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      const image = images[activeIndex];
      const downloadUrl = image.storageKey
        ? `/api/projects/files/download?${new URLSearchParams({
            storageKey: image.storageKey,
            fileName:
              image.fileName ||
              image.src.split('/').pop()?.split('?')[0] ||
              `image-${activeIndex + 1}`,
          }).toString()}`
        : image.src;
      const response = await fetch(downloadUrl, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to download image.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName =
        image.src.split('/').pop()?.split('?')[0] || `image-${activeIndex + 1}`;

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed  flex flex-col inset-0 z-60  items-center justify-center bg-black/90 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} media gallery`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl top-4 left-4  truncate text-sm font-medium text-white"
        onClick={(event) => event.stopPropagation()}
      >
        {images[activeIndex].fileName || images[activeIndex].alt}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black"
        aria-label="Close gallery"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18" />
          <path d="M6 6L18 18" />
        </svg>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void handleDownload();
        }}
        className="absolute top-4 right-18 gap-2 hover:bg-gray-300 flex h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-medium text-black"
        aria-label="Download file"
        disabled={isDownloading}
      >
        <DownloadIcon /> {isDownloading ? 'Downloading...' : 'Download'}
      </button>

      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-center rounded-t-2xl pt-4 md:pt-8 bg-black/30">
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPrevious();
              }}
              className="absolute top-1/2 left-0 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black md:left-4 md:h-11 md:w-11"
              aria-label="Previous media"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
              className="absolute top-1/2 right-0 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black md:right-4 md:h-11 md:w-11"
              aria-label="Next media"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18L15 12L9 6" />
              </svg>
            </button>
          </>
        ) : null}

        <div
          className="flex max-h-full w-full items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          {images[activeIndex].mediaType === 'video' ? (
            <GalleryVideo
              key={images[activeIndex].src}
              item={images[activeIndex]}
            />
          ) : (
            <img
              src={images[activeIndex].src}
              alt={images[activeIndex].alt}
              className="max-h-[65vh] w-auto max-w-full object-contain"
            />
          )}
        </div>
      </div>

      {images.length ? (
        <div
          className="px-4 w-full"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto flex max-w-6xl  items-center justify-center gap-3 overflow-x-auto rounded-b-2xl pb-4 md:pb-8 bg-black/30 p-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={`${image.src}-${index}`}
                type="button"
                onClick={() => onSelect(index)}
                className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  index === activeIndex
                    ? 'border-white'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                {image.mediaType === 'video' ? (
                  <VideoThumbnail
                    src={image.src}
                    label={image.fileName || image.alt}
                  />
                ) : (
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VideoThumbnail({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className="relative flex h-full w-full items-center justify-center bg-black text-white"
      aria-label={label}
    >
      {!failed ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="pointer-events-none h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            // Seek into the clip to display a decoded frame without playing it.
            if (Number.isFinite(video.duration) && video.duration > 0) {
              video.currentTime = Math.min(1, video.duration / 2);
            }
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="pt-8 text-xs">Video</span>
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="rounded-full bg-black/60 px-2 py-1 text-sm">▶</span>
      </span>
    </span>
  );
}

function GalleryVideo({ item }: { item: GalleryImage }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="p-12 text-center text-white">
      <p>This video could not be played in your browser.</p>
      <a href={item.src} target="_blank" rel="noreferrer" className="underline">
        Open video
      </a>
    </div>
  ) : (
    <video
      controls
      playsInline
      preload="metadata"
      src={item.src}
      aria-label={item.fileName || item.alt}
      className="max-h-[65vh] w-full max-w-full object-contain"
      onError={() => setFailed(true)}
    />
  );
}
