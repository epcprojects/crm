'use client';

import clsx from 'clsx';
import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
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
};

function mapMembersToMentionData(
  members: ProjectMember[],
): MentionableMember[] {
  return members.map((member) => ({
    id: member.id,
    display: getSingleWordDisplayName(member.fullName),
    email: member.email ?? null,
    fullName: member.fullName,
  }));
}

function getSingleWordDisplayName(fullName: string) {
  const [firstWord] = fullName.trim().split(/\s+/);

  return firstWord || fullName.trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hydrateMentionMarkupFromMessage(
  message: string,
  mentionedUserIds: string[],
  members: ProjectMember[],
) {
  if (!message.trim() || !mentionedUserIds.length || !members.length) {
    return message;
  }

  const membersById = new Map(
    members.map((member) => [member.id, getSingleWordDisplayName(member.fullName)]),
  );

  let hydratedMessage = message;

  mentionedUserIds.forEach((mentionedUserId) => {
    const displayName = membersById.get(mentionedUserId)?.trim();

    if (!displayName) {
      return;
    }

    const mentionRegex = new RegExp(`@${escapeRegExp(displayName)}\\b`);
    const markupValue = DEFAULT_MENTION_MARKUP
      .replace('__display__', displayName)
      .replace('__id__', mentionedUserId);

    hydratedMessage = hydratedMessage.replace(mentionRegex, markupValue);
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
}: DiscussionMentionsInputProps) {
  const mentionData = mapMembersToMentionData(members);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalHost(document.body);
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
      suggestionsPlacement="auto"
      anchorMode="left"
      suggestionsPortalHost={portalHost}
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
        highlighter:
          'pointer-events-none whitespace-pre-wrap break-words px-2 py-1 text-sm leading-6 text-transparent',
        input: clsx(
          'w-full resize-none  bg-transparent px-2 py-1 text-sm leading-6 text-gray-700 outline-none! placeholder:text-gray-400',
          inputClassName,
        ),
        suggestions:
          'z-[9999] overflow-hidden max-w-50 rounded-lg border border-slate-200 hover:bg-white! bg-white shadow-xl',
        suggestionsList:
          'max-h-60 w-full overflow-y-auto py-1  divide-y-0! px-1',
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
        className="rounded-md px-1 py-0.5 font-medium text-primary-light! bg-transparent!"
        renderSuggestion={(entry, _search, highlightedDisplay) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#10175A]">
              {highlightedDisplay as ReactNode}
            </span>
            {entry.fullName && entry.fullName !== entry.display ? (
              <span className="text-xs text-gray-500">
                {String(entry.fullName)}
              </span>
            ) : entry.email ? (
              <span className="text-xs text-gray-500">
                {String(entry.email)}
              </span>
            ) : null}
          </div>
        )}
      />
    </MentionsInput>
  );
}
