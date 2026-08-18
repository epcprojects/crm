'use client';

import clsx from 'clsx';
import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  Mention,
  MentionsInput,
  type MentionDataItem,
  type MentionsInputChangeEvent,
  type MentionsInputHandle,
} from 'react-mentions-ts';
import type { ProjectMember } from '../../lib/project-members';

type MentionableMember = MentionDataItem<{
  email?: string | null;
  fullName?: string;
}>;

const DEFAULT_MENTION_MARKUP = '@[__display__](__id__)';

const MENTION_MARKUP_REGEX = /@\[[^\]]+\]\(([^)]+)\)/g;

type DiscussionMentionsInputProps = {
  value: string;
  onChange: (payload: {
    markupValue: string;
    plainTextValue: string;
    mentionedUserIds: string[];
  }) => void;
  members: ProjectMember[];
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  mentionsRef?: RefObject<MentionsInputHandle | null>;
  onKeyDown?: (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onPaste?: React.ClipboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  style?: CSSProperties;
  inputClassName?: string;
  useTransparentInputText?: boolean;
  highlightMentionsInVisibleInput?: boolean;
};

function mapMembersToMentionData(
  members: ProjectMember[],
): MentionableMember[] {
  return members.map((member) => ({
    id: member.id,
    display: getMentionDisplayName(member.fullName),
    email: member.email ?? null,
    fullName: member.fullName,
  }));
}

function getMentionDisplayName(fullName: string) {
  return fullName.trim();
}

function getSingleWordDisplayName(fullName: string) {
  const [firstWord] = getMentionDisplayName(fullName).split(/\s+/);

  return firstWord || getMentionDisplayName(fullName);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getMentionedUserIdsFromPlainText(
  message: string,
  members: ProjectMember[],
) {
  if (!message.trim() || !members.length) {
    return [];
  }

  const matchedUserIds = new Set<string>();
  const normalizedMessage = message.trim();
  const shortNameMatches = new Map<string, string[]>();

  members.forEach((member) => {
    const fullName = getMentionDisplayName(member.fullName);

    if (!fullName) {
      return;
    }

    const fullNameRegex = new RegExp(
      `@${escapeRegExp(fullName)}(?=\\b|$)`,
      'g',
    );

    if (fullNameRegex.test(normalizedMessage)) {
      matchedUserIds.add(member.id);
    }

    const shortName = getSingleWordDisplayName(fullName);

    if (!shortName) {
      return;
    }

    const currentMatches = shortNameMatches.get(shortName) ?? [];
    currentMatches.push(member.id);
    shortNameMatches.set(shortName, currentMatches);
  });

  shortNameMatches.forEach((memberIds, shortName) => {
    if (memberIds.length !== 1) {
      return;
    }

    const shortNameRegex = new RegExp(
      `@${escapeRegExp(shortName)}(?=\\b|$)`,
      'g',
    );

    if (shortNameRegex.test(normalizedMessage)) {
      matchedUserIds.add(memberIds[0]);
    }
  });

  return Array.from(matchedUserIds);
}

export function hydrateMentionMarkupFromMessage(
  message: string,
  mentionedUserIds: string[],
  members: ProjectMember[],
) {
  if (!message.trim() || !members.length) {
    return message;
  }

  const resolvedMentionedUserIds = Array.from(
    new Set([
      ...mentionedUserIds,
      ...getMentionedUserIdsFromPlainText(message, members),
    ]),
  );

  if (!resolvedMentionedUserIds.length) {
    return message;
  }

  const membersById = new Map(
    members.map((member) => [
      member.id,
      {
        fullName: getMentionDisplayName(member.fullName),
        shortName: getSingleWordDisplayName(member.fullName),
      },
    ]),
  );

  let hydratedMessage = message;

  resolvedMentionedUserIds.forEach((mentionedUserId) => {
    const displayNames = membersById.get(mentionedUserId);

    if (!displayNames?.fullName) {
      return;
    }

    const markupValue = DEFAULT_MENTION_MARKUP.replace(
      '__display__',
      displayNames.fullName,
    ).replace('__id__', mentionedUserId);

    const fullNameRegex = new RegExp(
      `@${escapeRegExp(displayNames.fullName)}\\b`,
      'g',
    );

    if (fullNameRegex.test(hydratedMessage)) {
      fullNameRegex.lastIndex = 0;
      hydratedMessage = hydratedMessage.replace(fullNameRegex, markupValue);
      return;
    }

    const shortNameRegex = new RegExp(
      `@${escapeRegExp(displayNames.shortName)}\\b`,
      'g',
    );

    hydratedMessage = hydratedMessage.replace(shortNameRegex, markupValue);
  });

  return hydratedMessage;
}

function getMentionedUserIds(
  mentions: MentionsInputChangeEvent<MentionableMember>['mentions'],
) {
  return Array.from(
    new Set(
      mentions
        .map((mention) => String(mention.id ?? '').trim())
        .filter((mentionId) => mentionId.length > 0),
    ),
  );
}

export function getMentionedUserIdsFromMarkup(markupValue: string) {
  if (!markupValue.trim()) {
    return [];
  }

  return Array.from(
    new Set(
      Array.from(markupValue.matchAll(MENTION_MARKUP_REGEX))
        .map((match) => String(match[1] ?? '').trim())
        .filter((mentionId) => mentionId.length > 0),
    ),
  );
}
const avatarColorClasses = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-rose-100 text-rose-700',
] as const;

function getAvatarColorClasses(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  let hash = 0;

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash =
      normalizedValue.charCodeAt(index) +
      ((hash << 5) - hash);
  }

  const colorIndex =
    Math.abs(hash) % avatarColorClasses.length;

  return avatarColorClasses[colorIndex];
}
export default function DiscussionMentionsInput({
  value,
  onChange,
  members,
  placeholder,
  disabled = false,
  rows = 2,
  maxLength,
  inputRef,
  mentionsRef,
  onKeyDown,
  onPaste,
  style,
  inputClassName,
  useTransparentInputText = true,
  highlightMentionsInVisibleInput = false,
}: DiscussionMentionsInputProps) {
  const mentionData = mapMembersToMentionData(members);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    setPortalHost(document.body);

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);

      return () => {
        mediaQuery.removeEventListener('change', syncViewport);
      };
    }

    mediaQuery.addListener(syncViewport);

    return () => {
      mediaQuery.removeListener(syncViewport);
    };
  }, []);

  return (
    <MentionsInput
      ref={mentionsRef}
      value={value}
      inputRef={
        inputRef as
          | RefObject<HTMLInputElement | HTMLTextAreaElement>
          | undefined
      }
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      maxLength={maxLength}
      style={style}
      a11ySuggestionsListLabel="Project members"
      suggestionsPlacement={isMobileViewport ? 'above' : 'auto'}
      anchorMode={isMobileViewport ? 'left' : 'caret'}
      suggestionsPortalHost={isMobileViewport ? null : portalHost}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onMentionsChange={({ value: nextValue, plainTextValue, mentions }) =>
        onChange({
          markupValue: nextValue,
          plainTextValue,
          mentionedUserIds: getMentionedUserIds(mentions),
        })
      }
      classNames={{
        control: 'relative',
        highlighter: clsx(
          'pointer-events-none whitespace-pre-wrap break-words px-2 py-1 text-sm leading-6',
          highlightMentionsInVisibleInput
            ? 'relative z-10 text-transparent'
            : 'text-gray-700',
        ),
        highlighterSubstring: clsx(
          highlightMentionsInVisibleInput
            ? 'text-transparent'
            : 'text-gray-700',
        ),
        input: clsx(
          'w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 outline-none! placeholder:text-gray-400',
          highlightMentionsInVisibleInput ? 'relative z-0' : '',
          useTransparentInputText
            ? 'text-transparent caret-gray-700'
            : 'text-gray-700 caret-gray-700',
          inputClassName,
        ),
        suggestions: clsx(
          'discussion-mentions-suggestions z-[9999] overflow-hidden border border-slate-200 bg-white shadow-xl',
          isMobileViewport
            ? 'discussion-mentions-mobile-panel w-full max-w-none rounded-lg! md:rounded-2xl! border-gray-200! shadow-[0_18px_50px_rgb(0_0_0/0.16)]!'
            : 'max-w-50 rounded-lg',
        ),
        suggestionsList: clsx(
          'tiny-scrollbar w-full overflow-y-auto divide-y-0! px-1',
          isMobileViewport
            ? 'max-h-[min(12rem,42vh)] pt-1 pb-2'
            : 'max-h-50 py-1',
        ),
        suggestionItem:
          'cursor-pointer px-3 py-2 text-left transition hover:!bg-gray-100 rounded-lg!',
        suggestionItemFocused: '!bg-gray-100 !text-gray-900',
      }}
    >
      <Mention
        trigger="@"
        data={mentionData}
        appendSpaceOnAdd
        displayTransform={(_id, display) => `@${display}`}
        className={clsx(
          'rounded-md px-1 py-0.5 font-medium text-[#3165F6]!',
          highlightMentionsInVisibleInput ? 'bg-white!' : 'bg-transparent!',
        )}
        style={{
          color: '#3165F6',
          backgroundColor: highlightMentionsInVisibleInput
            ? '#ffffff'
            : 'transparent',
          fontWeight: 400,
        }}
        renderSuggestion={(entry) => {
  const fullName = String(
    entry.fullName ?? entry.display ?? '',
  ).trim();

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U';

  const avatarColors = getAvatarColorClasses(fullName);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColors}`}
      >
        {initials}
      </span>

      <span className="min-w-0 truncate text-sm font-medium text-[#10175A]">
        {fullName}
      </span>
    </div>
  );
}}
      />
    </MentionsInput>
  );
}
