'use client';

import { useState, type ReactNode } from 'react';
import { getFileUrl } from '../projects/ProjectFilesPanel';
import { getAttachmentMediaType } from './MediaAttachmentPreview';
import type { DiscussionAttachment } from './types';

export function getCollageType(attachments: DiscussionAttachment[]) {
  if (attachments.length < 2) return null;
  const isImage = (attachment: DiscussionAttachment) =>
    ['png', 'jpg', 'jpeg', 'svg'].includes(
      attachment.extension?.trim().toLowerCase() ?? '',
    );
  if (attachments.every(isImage)) return 'image';
  if (
    attachments.every(
      (attachment) => getAttachmentMediaType(attachment.extension) === 'video',
    )
  )
    return 'video';
  return null;
}

export default function AttachmentCollage({
  attachments,
  onOpen,
  renderAction,
}: {
  attachments: DiscussionAttachment[];
  onOpen: (attachment: DiscussionAttachment) => void;
  renderAction?: (attachment: DiscussionAttachment) => ReactNode;
}) {
  const hiddenCount = Math.max(0, attachments.length - 4);

  return (
    <div className="grid w-87.5 max-w-full grid-cols-2 gap-1 overflow-hidden rounded-xl">
      {attachments.slice(0, 4).map((attachment, index) => (
        <div
          key={attachment.id}
          className={`relative min-w-0 overflow-hidden bg-gray-100 ${attachments.length === 3 && index === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}
        >
          <button
            type="button"
            onClick={() => onOpen(attachment)}
            aria-label={
              index === 3 && hiddenCount > 0
                ? `Open ${attachment.name} and ${hiddenCount} more attachments`
                : `Open ${attachment.name}`
            }
            className="block h-full w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          >
            <CollageTile
              attachment={attachment}
              hiddenCount={index === 3 ? hiddenCount : 0}
            />
          </button>
          {renderAction ? (
            <div className="absolute right-1 top-1 rounded-full bg-white/90 p-1">
              {renderAction(attachment)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CollageTile({
  attachment,
  hiddenCount,
}: {
  attachment: DiscussionAttachment;
  hiddenCount: number;
}) {
  const [failed, setFailed] = useState(false);
  const isVideo = getAttachmentMediaType(attachment.extension) === 'video';
  const src = attachment.storageKey
    ? getFileUrl(attachment.storageKey)
    : attachment.url;
  return (
    <span className="relative block h-full w-full">
      {!src || failed ? (
        <span className="flex h-full items-center justify-center p-3 text-sm text-gray-600">
          {attachment.name}
        </span>
      ) : isVideo ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="pointer-events-none h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (Number.isFinite(video.duration) && video.duration > 0)
              video.currentTime = Math.min(1, video.duration / 2);
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          src={src}
          alt={attachment.name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
      {hiddenCount > 0 ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/50 text-4xl font-medium text-white"
        >
          +{hiddenCount}
        </span>
      ) : isVideo ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="rounded-full bg-black/60 h-12 w-12 flex items-center justify-center text-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={20}
              height={20}
              fill="white"
              viewBox="0 0 448 512"
            >
              <path d="M91.2 36.9c-12.4-6.8-27.4-6.5-39.6 .7S32 57.9 32 72l0 368c0 14.1 7.5 27.2 19.6 34.4s27.2 7.5 39.6 .7l336-184c12.8-7 20.8-20.5 20.8-35.1s-8-28.1-20.8-35.1l-336-184z" />
            </svg>
          </span>
        </span>
      ) : null}
    </span>
  );
}
