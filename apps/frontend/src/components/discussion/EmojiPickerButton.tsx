'use client';

import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';

type EmojiPickerButtonProps = {
  disabled?: boolean;
  onSelectEmoji: (emoji: string) => void;
};

export default function EmojiPickerButton({
  disabled = false,
  onSelectEmoji,
}: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelectEmoji(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Open emoji picker"
        aria-expanded={isOpen}
      >
        <EmojiSmileIcon />
      </button>

      {isOpen ? (
        <div className="absolute bottom-12 right-0 z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgb(0_0_0/0.16)]">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.LIGHT}
            width={320}
            height={400}
            searchPlaceholder="Search emoji"
            lazyLoadEmojis
          />
        </div>
      ) : null}
    </div>
  );
}

function EmojiSmileIcon() {
  return (
    <svg
      width="20"
      height="20"
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
