'use client';

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import clsx from 'clsx';
import { useMemo, useState, type CSSProperties } from 'react';
import type { DiscussionReaction } from './types';
import { getInitials } from '../../app/(main-pages)/dashboard/page';

const PICKER_WIDTH = 320;
const PICKER_HEIGHT = 360;

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
  const triggerPositionClass =
    align === 'end'
      ? '-left-10! top-[calc(50%-18px)]  right-auto'
      : '-right-10! top-[calc(50%-18px)]  left-auto';
  const reactionPositionClass =
    align === 'end' || from === 'thread' ? 'right-3 left-auto' : 'left-3';
  const pickerAnchor = align === 'end' ? 'top end' : 'top start';

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
                'absolute top-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600  opacity-0 transition hover:bg-gray-50 group-hover/reply:opacity-100 group-focus-within/reply:opacity-100 data-open:opacity-100',
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
              className="z-[7001] origin-top overflow-hidden rounded-sm  outline-none transition duration-150 data-closed:scale-95 data-closed:opacity-0"
            >
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
            </PopoverPanel>
          </>
        )}
      </Popover>

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

  return (
    <Popover as="div" className={clsx('absolute -bottom-5 z-20', className)}>
      {({ close }) => (
        <>
          <div className="flex flex-wrap items-center gap-0.75 rounded-xl border border-gray-200 bg-white px-2 py-1 ">
            {reactions.map((reaction) => (
              <PopoverButton
                key={reaction.emoji}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setSelectedEmoji(reaction.emoji)}
                className={clsx(
                  'inline-flex items-center gap-0.5 rounded-full text-[15px] font-medium transition ',
                  // selectedReaction?.emoji === reaction.emoji &&
                  //   'bg-violet-50 text-violet-700',
                )}
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 ? (
                  <span className="text-xs">{reaction.count}</span>
                ) : null}
              </PopoverButton>
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
            className="z-[7002] w-80 origin-top rounded-2xl border border-gray-200 bg-white py-3 shadow-[0_18px_50px_rgb(0_0_0/0.16)] outline-none transition duration-150 data-closed:scale-95 data-closed:opacity-0"
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
      <p className="text-sm px-3 font-semibold text-gray-900">
        {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
      </p>

      <div className="mt-2 px-3 flex flex-wrap items-center gap-2">
        {reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => onSelectEmoji(reaction.emoji)}
            className={clsx(
              ' gap-1 rounded-full border  text-base px-1 min-w-7.5 h-7.5 flex items-center justify-center font-medium transition',
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
      <hr className="text-gray-200 mt-3" />
      <div className="overflow-y-auto pt-2 px-2">
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
                <span className="flex h-6.5 w-6.5 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-purple-100 text-sm md:text-base font-semibold text-purple-700">
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
