'use client';

import { useEffect, useState } from 'react';
import { getFileUrl } from '../projects/ProjectFilesPanel';
import type { DiscussionAttachment } from './types';

export function getAttachmentMediaType(extension?: string) {
  const normalized = extension?.trim().toLowerCase().replace(/^\./, '');
  if (['mp4', 'webm', 'mov', 'm4v'].includes(normalized ?? '')) return 'video';
  if (
    ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'weba'].includes(
      normalized ?? '',
    )
  )
    return 'audio';
  return null;
}

export function hasOnlyAudioAttachments(attachments?: DiscussionAttachment[]) {
  return (
    Boolean(attachments?.length) &&
    (attachments ?? []).every(
      (attachment) => getAttachmentMediaType(attachment.extension) === 'audio',
    )
  );
}

// Audio is played through a short-lived presigned download URL (the same
// signed-key scheme used for uploads), so it works even when the bucket is
// private or the CDN does not serve the object. The CDN link is the fallback.
const PRESIGNED_URL_TTL_MS = 50 * 60 * 1000; // URLs are signed for 1 hour
const presignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

function getStorageKey(value?: string) {
  if (!value) {
    return '';
  }

  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, '');
  }

  try {
    return decodeURIComponent(new URL(value).pathname.replace(/^\/+/, ''));
  } catch {
    return '';
  }
}

async function fetchPresignedDownloadUrl(storageKey: string) {
  const cached = presignedUrlCache.get(storageKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const params = new URLSearchParams({ key: storageKey, action: 'download' });
  const response = await fetch(`/api/utility/presigned-url?${params}`, {
    method: 'GET',
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => null)) as {
    url?: string;
  } | null;

  if (!response.ok || !data?.url) {
    throw new Error('Failed to get download URL.');
  }

  presignedUrlCache.set(storageKey, {
    url: data.url,
    expiresAt: Date.now() + PRESIGNED_URL_TTL_MS,
  });

  return data.url;
}

function usePlayableAudioUrl(
  attachment: DiscussionAttachment,
  enabled: boolean,
) {
  const fallbackUrl = attachment.storageKey
    ? getFileUrl(attachment.storageKey)
    : attachment.url;
  const storageKey = attachment.storageKey
    ? getStorageKey(attachment.storageKey)
    : '';
  const [resolved, setResolved] = useState<{
    key: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !storageKey) {
      return;
    }

    let cancelled = false;

    fetchPresignedDownloadUrl(storageKey)
      .then((url) => {
        if (!cancelled) {
          setResolved({ key: storageKey, url });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved({ key: storageKey, url: fallbackUrl ?? '' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, storageKey, fallbackUrl]);

  if (!storageKey) {
    return { src: fallbackUrl ?? '', isLoading: false };
  }

  return {
    src: resolved?.key === storageKey ? resolved.url : '',
    isLoading: resolved?.key !== storageKey,
  };
}

export default function MediaAttachmentPreview({
  attachment,
  onOpenVideo,
}: {
  attachment: DiscussionAttachment;
  onOpenVideo: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const isAudio = getAttachmentMediaType(attachment.extension) === 'audio';
  const audio = usePlayableAudioUrl(attachment, isAudio);
  const src = isAudio
    ? audio.src
    : attachment.storageKey
      ? getFileUrl(attachment.storageKey)
      : attachment.url;

  if (getAttachmentMediaType(attachment.extension) === 'video') {
    return (
      <button
        type="button"
        onClick={onOpenVideo}
        aria-label={`Play ${attachment.name}`}
        className="relative min-w-0 flex-1 overflow-hidden rounded-sm bg-black text-white"
      >
        {src && !failed ? (
          <video
            muted
            playsInline
            preload="metadata"
            src={src}
            className="pointer-events-none max-h-64 min-h-32 w-full object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="block p-12">Video</span>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="rounded-full bg-black/60 h-14 w-14 flex items-center justify-center text-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={24}
              height={24}
              fill="white"
              viewBox="0 0 448 512"
            >
              <path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="min-w-0 flex-1 space-y-2">
      {audio.isLoading ? (
        <p className="text-sm text-gray-500">Loading audio…</p>
      ) : src && !failed ? (
        <audio
          controls
          preload="metadata"
          src={src}
          aria-label={attachment.name}
          className="w-full sm:min-w-72"
          onError={() => setFailed(true)}
          onLoadedMetadata={(event) => {
            // Browser-recorded audio has no duration header; seek to the end
            // once so the player can show the real length.
            const audio = event.currentTarget;

            if (audio.duration === Infinity) {
              audio.currentTime = 1e101;
              audio.addEventListener(
                'timeupdate',
                () => {
                  audio.currentTime = 0;
                },
                { once: true },
              );
            }
          }}
        />
      ) : (
        <p className="text-sm text-gray-500">
          Preview unavailable. Open the file to play it.
        </p>
      )}
      {/* <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="block truncate text-sm text-gray-700 "
      >
        {attachment.name}
      </a> */}
      {/* {attachment.sizeLabel ? (
        <p className="text-sm text-gray-500">{attachment.sizeLabel}</p>
      ) : null} */}
    </div>
  );
}
