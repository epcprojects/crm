'use client';

export type DiscussionReply = {
  id: string;
  authorId?: string;
  replyCount?: number;
  status?: 'sent' | 'read';
  updatedAt?: string;
  isEdited?: boolean;
  author: {
    name: string;
    initials: string;
  };
  createdAt: string;
  message: string;
  attachments?: DiscussionAttachment[];
};

export type DiscussionAttachment = {
  id: string;
  name: string;
  sizeLabel?: string;
  extension?: string;
  storageKey?: string;
  url?: string;
};
