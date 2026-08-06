'use client';

export type DiscussionReply = {
  id: string;
  authorId?: string;
  replyCount?: number;
  status?: 'sent' | 'read';
  updatedAt?: string;
  isEdited?: boolean;
  reactions?: DiscussionReaction[];
  author: {
    name: string;
    initials: string;
  };
  createdAt: string;
  message: string;
  attachments?: DiscussionAttachment[];
};

export type DiscussionReaction = {
  emoji: string;
  count: number;
  reactedByCurrentUser?: boolean;
  actors?: DiscussionReactionActor[];
};

export type DiscussionReactionActor = {
  id?: string;
  name?: string;
  isCurrentUser?: boolean;
};

export type DiscussionAttachment = {
  id: string;
  name: string;
  sizeLabel?: string;
  extension?: string;
  storageKey?: string;
  url?: string;
};
