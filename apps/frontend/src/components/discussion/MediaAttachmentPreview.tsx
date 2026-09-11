'use client';

import { useState } from 'react';
import { getFileUrl } from '../projects/ProjectFilesPanel';
import type { DiscussionAttachment } from './types';

export function getAttachmentMediaType(extension?: string) {
  const normalized = extension?.trim().toLowerCase().replace(/^\./, '');
  if (['mp4', 'webm', 'mov', 'm4v'].includes(normalized ?? '')) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(normalized ?? ''))
    return 'audio';
  return null;
}

export function hasOnlyAudioAttachments(attachments?: DiscussionAttachment[]) {
  return Boolean(attachments?.length) && (attachments ?? []).every(
    (attachment) => getAttachmentMediaType(attachment.extension) === 'audio',
  );
}

export default function MediaAttachmentPreview({
  attachment,
  onOpenVideo,
}: {
  attachment: DiscussionAttachment;
  onOpenVideo: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = attachment.storageKey
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
      {src && !failed ? (
        <audio
          controls
          preload="metadata"
          src={src}
          aria-label={attachment.name}
          className="w-full sm:min-w-72"
          onError={() => setFailed(true)}
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
