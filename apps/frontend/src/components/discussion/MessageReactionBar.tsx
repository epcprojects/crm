'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import clsx from 'clsx';
import { useMemo, useState, type CSSProperties } from 'react';
import type { DiscussionReaction } from './types';
import { getInitials } from '../../lib/format';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { CloseIcon } from 'apps/frontend/public/icons';

const PICKER_WIDTH = 320;
const PICKER_HEIGHT = 360;

const MOBILE_REACTIONS = ['👍', '❤️', '😀', '😢', '🙏', '👎', '😡'];

type MessageReactionBarProps = {
  reactions: DiscussionReaction[];
  onToggleReaction: (emoji: string) => void;
  currentUserId?: string;
  align?: 'start' | 'end';
  from?: 'thread';
  className?: string;
};

type ReactionActorView = {
  id?: string;
  name: string;
  isCurrentUser: boolean;
  emoji: string;
};

export default function MessageReactionBar({
  reactions,
  onToggleReaction,
  currentUserId = '',
  align = 'start',
  from,
  className,
}: MessageReactionBarProps) {
  const [mobileEmojiSheetOpen, setMobileEmojiSheetOpen] = useState(false);

  const triggerPositionClass =
    align === 'end'
      ? '-left-10! top-[calc(50%-18px)] right-auto'
      : '-right-10! top-[calc(50%-18px)] left-auto';

  const reactionPositionClass =
    align === 'end' || from === 'thread' ? 'right-3 left-auto' : 'left-3';

  const pickerAnchor = align === 'end' ? 'top end' : 'top start';

  const handleOpenMobileEmojiSheet = (closePopover: () => void) => {
    setMobileEmojiSheetOpen(true);
    closePopover();
  };

  const handleMobileEmojiSelect = (emoji: string) => {
    onToggleReaction(emoji);
    setMobileEmojiSheetOpen(false);
  };

  return (
    <>
      <Popover as="div" className="contents">
        {({ open, close }) => (
          <>
            <PopoverButton
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              aria-label="Open reactions"
              className={clsx(
                'absolute top-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 opacity-0 transition hover:bg-gray-50 sm:group-hover/reply:opacity-100 max-sm:group-focus-within/reply:opacity-100 data-open:opacity-100',
                triggerPositionClass,
                open && 'opacity-100',
                className,
              )}
            >
              <EmojiSmileIcon />
            </PopoverButton>

            <PopoverPanel
              anchor={{
                to: pickerAnchor,
                gap: 8,
                padding: 12,
              }}
              portal
              transition
              className="z-[7001] origin-top overflow-hidden rounded-sm outline-none transition duration-150 data-closed:scale-95 data-closed:opacity-0"
            >
              <div className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-gray-100 bg-white px-2 py-1.5  sm:hidden">
                {MOBILE_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onToggleReaction(emoji);
                      close();
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none transition hover:bg-gray-100 active:scale-90"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}

                <button
                  type="button"
                  aria-label="More emojis"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleOpenMobileEmojiSheet(close)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg font-medium leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 active:scale-90"
                >
                  +
                </button>
              </div>

              <div className="hidden sm:block">
                <EmojiPicker
                  theme={Theme.LIGHT}
                  width={PICKER_WIDTH}
                  height={PICKER_HEIGHT}
                  reactionsDefaultOpen
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                  searchPlaceholder="Search emoji"
                  lazyLoadEmojis
                  onReactionClick={(emojiData: EmojiClickData) => {
                    onToggleReaction(emojiData.emoji);
                    close();
                  }}
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    onToggleReaction(emojiData.emoji);
                    close();
                  }}
                  style={
                    {
                      '--epr-emoji-size': '20px',
                      '--epr-emoji-gap': '4px',
                    } as CSSProperties
                  }
                />
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>

      <Dialog
        open={mobileEmojiSheetOpen}
        onClose={setMobileEmojiSheetOpen}
        className="relative z-[8000] sm:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 transition duration-200 data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex items-end">
          <DialogPanel
            transition
            className="w-full rounded-t-3xl bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgb(0_0_0/0.18)] transition duration-300 ease-out data-closed:translate-y-full"
          >
            <div
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300"
              aria-hidden="true"
            />

            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-base font-semibold text-gray-900">
                Choose an emoji
              </p>

              <button
                type="button"
                onClick={() => setMobileEmojiSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-600 transition hover:bg-gray-200"
                aria-label="Close emoji picker"
              >
                <CloseIcon width="14" height="14" />
              </button>
            </div>

            <div className="overflow-hidden rounded-sm">
              <EmojiPicker
                theme={Theme.LIGHT}
                width="100%"
                height={400}
                reactionsDefaultOpen={false}
                allowExpandReactions={false}
                previewConfig={{ showPreview: false }}
                skinTonesDisabled
                searchPlaceholder="Search emoji"
                lazyLoadEmojis
                onReactionClick={(emojiData: EmojiClickData) => {
                  handleMobileEmojiSelect(emojiData.emoji);
                }}
                onEmojiClick={(emojiData: EmojiClickData) => {
                  handleMobileEmojiSelect(emojiData.emoji);
                }}
                style={
                  {
                    '--epr-emoji-size': '22px',
                    '--epr-emoji-gap': '5px',
                  } as CSSProperties
                }
              />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {reactions.length ? (
        <SharedReactionPopover
          reactions={reactions}
          onToggleReaction={onToggleReaction}
          currentUserId={currentUserId}
          align={align}
          className={reactionPositionClass}
        />
      ) : null}
    </>
  );
}

function SharedReactionPopover({
  reactions,
  onToggleReaction,
  currentUserId,
  align,
  className,
}: {
  reactions: DiscussionReaction[];
  onToggleReaction: (emoji: string) => void;
  currentUserId: string;
  align: 'start' | 'end';
  className?: string;
}) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(
    reactions[0]?.emoji ?? '',
  );
  const [mobileReactionDetailsOpen, setMobileReactionDetailsOpen] =
    useState(false);

  const panelAnchor = align === 'end' ? 'top end' : 'top start';

  const selectedReaction = useMemo(
    () =>
      reactions.find((reaction) => reaction.emoji === selectedEmoji) ??
      reactions[0] ??
      null,
    [reactions, selectedEmoji],
  );

  const allActors = useMemo(
    () => buildAllReactionActors(reactions, currentUserId),
    [reactions, currentUserId],
  );

  const handleOpenMobileReactionDetails = (emoji: string) => {
    setSelectedEmoji(emoji);
    setMobileReactionDetailsOpen(true);
  };

  const handleRemoveMobileReaction = (emoji: string) => {
    onToggleReaction(emoji);
    setMobileReactionDetailsOpen(false);
  };

  return (
    <>
      <Popover as="div" className={clsx('absolute -bottom-5 z-20', className)}>
        {({ close }) => (
          <>
            <div className="flex flex-wrap items-center gap-0.75 rounded-xl border border-gray-200 bg-white px-2 py-1">
              {reactions.map((reaction) => (
                <span key={reaction.emoji}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      handleOpenMobileReactionDetails(reaction.emoji)
                    }
                    className="inline-flex items-center gap-0.5 rounded-full text-[15px] font-medium transition sm:hidden"
                  >
                    <span>{reaction.emoji}</span>

                    {reaction.count > 1 ? (
                      <span className="text-xs">{reaction.count}</span>
                    ) : null}
                  </button>
                  <PopoverButton
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setSelectedEmoji(reaction.emoji)}
                    className="hidden items-center gap-0.5 rounded-full text-[15px] font-medium transition sm:inline-flex"
                  >
                    <span>{reaction.emoji}</span>

                    {reaction.count > 1 ? (
                      <span className="text-xs">{reaction.count}</span>
                    ) : null}
                  </PopoverButton>
                </span>
              ))}
            </div>
            <PopoverPanel
              anchor={{
                to: panelAnchor,
                gap: 10,
                padding: 12,
              }}
              portal
              transition
              className="z-[7002] hidden w-80 origin-top rounded-2xl border border-gray-200 bg-white py-3 shadow-[0_18px_50px_rgb(0_0_0/0.16)] outline-none transition duration-150 data-closed:scale-95 data-closed:opacity-0 sm:block"
            >
              {selectedReaction ? (
                <SharedReactionTray
                  reactions={reactions}
                  selectedEmoji={selectedReaction.emoji}
                  allActors={allActors}
                  onSelectEmoji={setSelectedEmoji}
                  onRemoveReaction={(emoji) => {
                    onToggleReaction(emoji);
                    close();
                  }}
                />
              ) : null}
            </PopoverPanel>
          </>
        )}
      </Popover>

      <Dialog
        open={mobileReactionDetailsOpen}
        onClose={setMobileReactionDetailsOpen}
        className="relative z-[8000] sm:hidden"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 transition duration-200 data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex items-end">
          <DialogPanel
            transition
            className="flex max-h-[80dvh] w-full flex-col rounded-t-3xl bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgb(0_0_0/0.18)] transition duration-300 ease-out data-closed:translate-y-full"
          >
            <div
              className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-gray-300"
              aria-hidden="true"
            />

            <div className="mb-3 flex shrink-0 items-center justify-between px-1">
              <p className="text-base font-semibold text-gray-900">Reactions</p>

              <button
                type="button"
                onClick={() => setMobileReactionDetailsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                aria-label="Close reaction details"
              >
                <CloseIcon width="14" height="14" />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto">
              {selectedReaction ? (
                <SharedReactionTray
                  reactions={reactions}
                  selectedEmoji={selectedReaction.emoji}
                  allActors={allActors}
                  onSelectEmoji={setSelectedEmoji}
                  onRemoveReaction={handleRemoveMobileReaction}
                />
              ) : null}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
function SharedReactionTray({
  reactions,
  selectedEmoji,
  allActors,
  onSelectEmoji,
  onRemoveReaction,
}: {
  reactions: DiscussionReaction[];
  selectedEmoji: string;
  allActors: ReactionActorView[];
  onSelectEmoji: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
}) {
  const selectedReaction =
    reactions.find((reaction) => reaction.emoji === selectedEmoji) ??
    reactions[0];

  const totalReactions = reactions.reduce(
    (sum, reaction) => sum + Math.max(1, reaction.count),
    0,
  );

  return (
    <div className="flex max-h-[min(28rem,70vh)] flex-col">
      <p className="px-3 text-sm font-semibold text-gray-900">
        {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 px-3">
        {reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => onSelectEmoji(reaction.emoji)}
            className={clsx(
              'flex h-7.5 min-w-7.5 items-center justify-center gap-1 rounded-full border px-1 text-base font-medium transition',
              reaction.emoji === selectedReaction.emoji
                ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
            )}
          >
            <span>{reaction.emoji}</span>

            {reaction.count > 1 ? <span>{reaction.count}</span> : null}
          </button>
        ))}
      </div>

      <hr className="mt-3 text-gray-200" />

      <div className="overflow-y-auto px-2 pt-2">
        {allActors.length ? (
          allActors.map((actor, index) => (
            <button
              key={`${actor.emoji}-${actor.id ?? actor.name}-${index}`}
              type="button"
              onClick={() => {
                if (!actor.isCurrentUser) {
                  return;
                }

                onRemoveReaction(actor.emoji);
              }}
              className={clsx(
                'flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left',
                actor.isCurrentUser
                  ? 'cursor-pointer hover:bg-gray-50'
                  : 'cursor-default!',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700 sm:h-8 sm:w-8 md:text-base">
                  {getInitials(actor.name)}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {actor.name}
                  </p>

                  {actor.isCurrentUser ? (
                    <p className="text-xs text-gray-500">Click to remove</p>
                  ) : null}
                </div>
              </div>

              <span className="shrink-0 text-xl leading-none">
                {actor.emoji}
              </span>
            </button>
          ))
        ) : (
          <div className="px-2 py-3 text-sm text-gray-500">
            Reaction details are not available for this message yet.
          </div>
        )}
      </div>
    </div>
  );
}

function buildReactionActors(
  reaction: DiscussionReaction,
  currentUserId: string,
): ReactionActorView[] {
  const actors =
    reaction.actors?.map((actor) => ({
      id: actor.id,
      emoji: reaction.emoji,
      name:
        actor.isCurrentUser || (currentUserId && actor.id === currentUserId)
          ? 'You'
          : actor.name?.trim() || 'Unknown user',
      isCurrentUser: Boolean(
        actor.isCurrentUser || (currentUserId && actor.id === currentUserId),
      ),
    })) ?? [];

  if (actors.length) {
    return actors;
  }

  if (reaction.reactedByCurrentUser) {
    return [
      {
        id: currentUserId || undefined,
        emoji: reaction.emoji,
        name: 'You',
        isCurrentUser: true,
      },
    ];
  }

  return [];
}

function buildAllReactionActors(
  reactions: DiscussionReaction[],
  currentUserId: string,
) {
  return reactions.flatMap((reaction) =>
    buildReactionActors(reaction, currentUserId),
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
