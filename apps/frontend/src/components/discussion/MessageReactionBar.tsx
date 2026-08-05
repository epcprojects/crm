'use client';

import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import clsx from 'clsx';
import type { DiscussionReaction } from './types';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉'] as const;

type MessageReactionBarProps = {
  reactions: DiscussionReaction[];
  onToggleReaction: (emoji: string) => void;
  className?: string;
};

export default function MessageReactionBar({
  reactions,
  onToggleReaction,
  className,
}: MessageReactionBarProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (!containerRef.current?.contains(target)) {
        setIsPickerOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPickerOpen]);

  return (
    <>
      <div
        ref={containerRef}
        className={clsx(
          'absolute -top-4 left-3 z-20 flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 shadow-[0_10px_24px_rgb(0_0_0/0.12)] opacity-0 transition group-hover/reply:opacity-100 group-focus-within/reply:opacity-100',
          className,
        )}
      >
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggleReaction(emoji)}
            className={clsx(
              'flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:bg-gray-100',
              reactions.some(
                (reaction) =>
                  reaction.emoji === emoji && reaction.reactedByCurrentUser,
              ) && 'bg-gray-100',
            )}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setIsPickerOpen((current) => !current)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:bg-gray-100"
          aria-label="More reactions"
        >
          <EmojiSmileIcon />
        </button>

        {isPickerOpen ? (
          <div className="absolute top-full left-0 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgb(0_0_0/0.16)]">
            <EmojiPicker
              onEmojiClick={(emojiData: EmojiClickData) => {
                onToggleReaction(emojiData.emoji);
                setIsPickerOpen(false);
              }}
              theme={Theme.LIGHT}
              width={300}
              height={360}
              searchPlaceholder="Search emoji"
              lazyLoadEmojis
            />
          </div>
        ) : null}
      </div>

      {reactions.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              onClick={() => onToggleReaction(reaction.emoji)}
              className={clsx(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                reaction.reactedByCurrentUser
                  ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100',
              )}
            >
              <span>{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function EmojiSmileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7.08333 8.33333C7.54357 8.33333 7.91667 7.96024 7.91667 7.5C7.91667 7.03976 7.54357 6.66667 7.08333 6.66667C6.6231 6.66667 6.25 7.03976 6.25 7.5C6.25 7.96024 6.6231 8.33333 7.08333 8.33333Z"
        fill="currentColor"
      />
      <path
        d="M12.9167 8.33333C13.3769 8.33333 13.75 7.96024 13.75 7.5C13.75 7.03976 13.3769 6.66667 12.9167 6.66667C12.4564 6.66667 12.0833 7.03976 12.0833 7.5C12.0833 7.96024 12.4564 8.33333 12.9167 8.33333Z"
        fill="currentColor"
      />
      <path
        d="M6.66667 11.6667C7.40505 12.8733 8.63489 13.6667 10 13.6667C11.3651 13.6667 12.5949 12.8733 13.3333 11.6667"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
