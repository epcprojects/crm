'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ALLOWED_ATTACHMENT_ACCEPT,
  validateAttachments,
} from '../../lib/attachments';
import { FileTypePlaceholder } from '../../../public/icons';
import { getFileUrl } from '../projects/ProjectFilesPanel';
import ConfirmActionModal from '../modals/ConfirmActionModal';
import type { DiscussionAttachment, DiscussionReply } from './types';

type DiscussionPanelProps = {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  headerReply?: DiscussionReply | null;
  replies: DiscussionReply[];
  emptyTitle?: string;
  emptyDescription?: string;
  composerPlaceholder?: string;
  onSubmitReply?: (payload: {
    message: string;
    attachments: File[];
  }) => Promise<void> | void;
  isSubmittingReply?: boolean;
  canCompose?: boolean;
  canAttachFile?: boolean;
  requireMessage?: boolean;
  currentUserId?: string;
  showReplyMeta?: boolean;
  onReplyClick?: (reply: DiscussionReply) => void;
  onDeleteAttachment?: (attachment: DiscussionAttachment) => void;
  deletingAttachmentId?: string;
};

export default function TicketRepliesPanel({
  title = 'Replies',
  subtitle = 'Files auto-sync to repository',
  headerAction,
  headerReply,
  replies,
  emptyTitle = 'No replies yet.',
  emptyDescription = 'No responses have been added to this ticket yet.',
  composerPlaceholder = 'Write a reply...',
  onSubmitReply,
  isSubmittingReply = false,
  canCompose = Boolean(onSubmitReply),
  canAttachFile = true,
  requireMessage = true,
  currentUserId = '',
  showReplyMeta = false,
  onReplyClick,
  onDeleteAttachment,
  deletingAttachmentId,
}: DiscussionPanelProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<DiscussionAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [headerReply?.id, replies.length]);

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();

    if (
      (requireMessage
        ? !trimmedMessage
        : !trimmedMessage && !attachments.length) ||
      isSubmittingReply ||
      !onSubmitReply
    ) {
      return;
    }

    await onSubmitReply({
      message: trimmedMessage,
      attachments,
    });
    setMessage('');
    setAttachments([]);
    setAttachmentError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAttachmentChange = (files: FileList | File[] | null) => {
    const selectedFiles = files ? Array.from(files) : [];

    if (!selectedFiles.length) {
      setAttachments([]);
      setAttachmentError('');
      return;
    }

    const validationError = validateAttachments(selectedFiles);

    if (validationError) {
      setAttachments([]);
      setAttachmentError(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setAttachments(selectedFiles);
    setAttachmentError('');
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentToDelete || !onDeleteAttachment) {
      return;
    }

    await onDeleteAttachment(attachmentToDelete);
    setAttachmentToDelete(null);
  };

  return (
    <>
      <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2 sm:py-3 md:px-5">
          <div className="flex items-center gap-3">
            <h3 className="text-sm md:text-base font-semibold text-gray-900">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {subtitle ? (
              <p className="text-sm text-gray-900">{subtitle}</p>
            ) : null}
            {headerAction}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto scrollbar-hide px-3 py-5 md:px-5"
        >
          {headerReply ? (
            <div className="mb-4 border-b border-gray-200 pb-4">
              <article className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-xs font-bold text-purple-700">
                  {headerReply.author.initials}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {headerReply.author.name}
                    </span>
                    <span className="text-xs text-gray-700">
                      {headerReply.createdAt}
                    </span>
                  </div>
                  {headerReply.message ? (
                    <p className="text-sm font-normal text-gray-900">
                      {headerReply.message}
                    </p>
                  ) : null}
                  {headerReply.attachments?.length ? (
                    <div className="mt-2 grid gap-2">
                      {headerReply.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex min-w-0 w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-2.5 transition hover:bg-gray-50"
                        >
                          <a
                            href={getAttachmentUrl(attachment.storageKey)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 flex-1 items-start gap-3"
                          >
                            {isImageAttachment(attachment.extension) ? (
                              <img
                                className="rounded-sm h-10 border border-gray-200 w-10"
                                src={getFileUrl(attachment.storageKey)}
                              />
                            ) : (
                              <AttachmentFileIcon
                                extension={attachment.extension}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-700">
                                {attachment.name}
                              </p>
                              {attachment.sizeLabel ? (
                                <p className="text-sm text-gray-500">
                                  {attachment.sizeLabel}
                                </p>
                              ) : null}
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {typeof headerReply.replyCount === 'number' &&
                  headerReply.replyCount > 0 ? (
                    <p className="mt-2 text-xs font-medium text-gray-500">
                      {headerReply.replyCount}{' '}
                      {headerReply.replyCount === 1 ? 'Reply' : 'Replies'}
                    </p>
                  ) : null}
                </div>
              </article>
            </div>
          ) : null}

          {replies.length ? (
            <div className="space-y-5">
              {replies.map((reply) => {
                const isCurrentUserReply = Boolean(
                  currentUserId && reply.authorId === currentUserId,
                );

                return (
                  <article
                    key={reply.id}
                    className={`flex items-start gap-3 ${
                      isCurrentUserReply ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isCurrentUserReply ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-xs font-bold text-purple-700">
                        {reply.author.initials}
                      </span>
                    ) : null}
                    <div
                      className={`flex max-w-200 w-fit flex-col ${
                        isCurrentUserReply ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`mb-1 flex flex-wrap items-center gap-2 ${
                          isCurrentUserReply ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="text-sm font-bold text-gray-900">
                          {reply.author.name}
                        </span>
                        <span className="text-xs text-gray-700">
                          {reply.createdAt}
                        </span>
                      </div>
                      {reply.message || reply.attachments?.length ? (
                        <div
                          className={`w-full rounded-xl ${isCurrentUserReply ? 'rounded-tr-none' : 'rounded-tl-none'} ${reply.message && 'space-y-2 border border-gray-200 p-3 shadow-xs'}  bg-white  `}
                        >
                          {reply.message ? (
                            <p className="text-sm font-normal text-gray-900">
                              {reply.message}
                            </p>
                          ) : null}
                          {reply.attachments?.length ? (
                            <div
                              className={`grid gap-2 ${reply.attachments.length > 1 && 'md:grid-cols-2'} ${!reply.message && reply.attachments && reply.attachments.length > 1 && 'p-2 border border-gray-200 rounded-xl'} ${isCurrentUserReply ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                            >
                              {reply.attachments.map((attachment) => (
                                <div
                                  key={attachment.id}
                                  className="flex min-w-0 w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-2.5 transition hover:bg-gray-50"
                                >
                                  <a
                                    href={getAttachmentUrl(
                                      attachment.storageKey,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-w-0 flex-1 items-start gap-3"
                                  >
                                    {isImageAttachment(attachment.extension) ? (
                                      <img
                                        className="rounded-sm h-10  border border-gray-200 w-10"
                                        src={getFileUrl(attachment.storageKey)}
                                      />
                                    ) : (
                                      <AttachmentFileIcon
                                        extension={attachment.extension}
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-gray-700">
                                        {attachment.name}
                                      </p>
                                      {attachment.sizeLabel ? (
                                        <p className="text-sm text-gray-500">
                                          {attachment.sizeLabel}
                                        </p>
                                      ) : null}
                                    </div>
                                  </a>
                                  {onDeleteAttachment ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAttachmentToDelete(attachment)
                                      }
                                      disabled={
                                        deletingAttachmentId === attachment.id
                                      }
                                      className="shrink-0 text-gray-400 transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                      aria-label={`Delete ${attachment.name}`}
                                    >
                                      <AttachmentTrashIcon />
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {showReplyMeta ? (
                        <button
                          type="button"
                          onClick={() => onReplyClick?.(reply)}
                          disabled={!onReplyClick}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-700"
                        >
                          <ReplyArrowIcon />
                          {reply.replyCount && reply.replyCount > 0
                            ? `${reply.replyCount} ${reply.replyCount === 1 ? 'Reply' : 'Replies'}`
                            : 'Reply'}
                        </button>
                      ) : null}
                    </div>
                    {isCurrentUserReply ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-xs font-bold text-purple-700">
                        {reply.author.initials}
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
           <div className="flex h-full min-h-0 flex-col items-center justify-center text-center">
              <EmptyRepliesIcon />
              <p className="mt-2 sm:mt-4 text-base md:text-lg font-semibold text-gray-600">
                {emptyTitle}
              </p>
              <p className="mt-1 sm:mt-2 text-xs text-gray-500">
                {emptyDescription}
              </p>
            </div>
          )}
        </div>

        {canCompose ? (
          <div className="shrink-0 border-t border-gray-200 px-2 py-4 md:px-5">
            <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-3">
              <textarea
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={composerPlaceholder}
                disabled={isSubmittingReply}
                className="min-h-16 md:min-h-28 w-full resize-none bg-transparent px-2 py-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ALLOWED_ATTACHMENT_ACCEPT}
                multiple
                onChange={(event) =>
                  handleAttachmentChange(event.target.files ?? null)
                }
              />

              {attachments.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {attachments.map((attachment) => (
                    <div
                      key={`${attachment.name}-${attachment.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <p className="truncate text-sm text-gray-700">
                        {attachment.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const nextAttachments = attachments.filter(
                            (file) => file !== attachment,
                          );
                          setAttachments(nextAttachments);
                          if (!nextAttachments.length && fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        disabled={isSubmittingReply}
                        className="text-xs font-medium text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {attachmentError ? (
                <p className="mt-2 text-xs text-red-600">{attachmentError}</p>
              ) : null}

              <div className="mt-3 flex items-end justify-end gap-3">
                {/* <div className="text-xs text-gray-500">
                  {canAttachFile ? ALLOWED_ATTACHMENT_HELPER_TEXT : null}
                </div> */}
                <div className="flex items-center gap-2">
                  {canAttachFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmittingReply}
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <PaperclipIcon />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      (requireMessage
                        ? !message.trim()
                        : !message.trim() && !attachments.length) ||
                      isSubmittingReply
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10175A] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <TelegramIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <ConfirmActionModal
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => setAttachmentToDelete(null)}
        title="Delete Attachment?"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              “{attachmentToDelete?.name ?? 'this attachment'}”
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={
          Boolean(attachmentToDelete) &&
          deletingAttachmentId === attachmentToDelete?.id
        }
        onConfirm={handleConfirmDeleteAttachment}
      />
    </>
  );
}

function getAttachmentUrl(storageKey?: string) {
  if (!storageKey) {
    return '#';
  }

  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim() ?? '';
  const normalizedBaseUrl = cloudfrontUrl.replace(/\/+$/, '');
  const normalizedStorageKey = storageKey.replace(/^\/+/, '');

  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/${normalizedStorageKey}`
    : '#';
}

function AttachmentFileIcon({ extension }: { extension?: string }) {
  const label = normalizeAttachmentExtension(extension);
  const badgeClassName = getAttachmentBadgeClassName(label);

  return (
    <span className="relative">
      <span
        className={`rounded-xs absolute top-4.5 px-0.75 pt-1 pb-0.75 text-[10px] font-bold uppercase leading-none! text-white ${badgeClassName}`}
      >
        {label}
      </span>
      <FileTypePlaceholder />
    </span>
  );
}

function normalizeAttachmentExtension(extension?: string) {
  const normalizedExtension = (extension ?? 'file')
    .replace(/^svg\+xml$/i, 'svg')
    .replace(/^application\//i, '')
    .replace(/^image\//i, '')
    .trim()
    .toUpperCase();

  if (normalizedExtension === 'JPEG') {
    return 'JPG';
  }

  return normalizedExtension.slice(0, 4) || 'FILE';
}

function isImageAttachment(extension?: string) {
  const normalizedExtension = extension?.trim().toLowerCase();

  return (
    normalizedExtension === 'png' ||
    normalizedExtension === 'svg' ||
    normalizedExtension === 'jpg' ||
    normalizedExtension === 'jpeg'
  );
}

function getAttachmentBadgeClassName(extension: string) {
  if (extension === 'PDF') return 'bg-red-500';
  if (extension === 'DOC' || extension === 'DOCX') return 'bg-blue-600';
  if (extension === 'XLS' || extension === 'XLSX') return 'bg-green-600';
  if (['PNG', 'JPG', 'JPEG', 'SVG'].includes(extension)) return 'bg-violet-500';
  if (extension === 'ZIP') return 'bg-gray-600';
  return 'bg-[#10175A]';
}

function AttachmentTrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.6667 3.99992V3.46659C10.6667 2.71985 10.6667 2.34648 10.5213 2.06126C10.3935 1.81038 10.1895 1.60641 9.93865 1.47858C9.65344 1.33325 9.28007 1.33325 8.53333 1.33325H7.46667C6.71993 1.33325 6.34656 1.33325 6.06135 1.47858C5.81046 1.60641 5.60649 1.81038 5.47866 2.06126C5.33333 2.34648 5.33333 2.71985 5.33333 3.46659V3.99992M6.66667 7.66658V10.9999M9.33333 7.66658V10.9999M2 3.99992H14M12.6667 3.99992V11.4666C12.6667 12.5867 12.6667 13.1467 12.4487 13.5746C12.2569 13.9509 11.951 14.2569 11.5746 14.4486C11.1468 14.6666 10.5868 14.6666 9.46667 14.6666H6.53333C5.41323 14.6666 4.85318 14.6666 4.42535 14.4486C4.04903 14.2569 3.74307 13.9509 3.55132 13.5746C3.33333 13.1467 3.33333 12.5867 3.33333 11.4666V3.99992"
        stroke="#A4A7AE"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.5 3.75C7.15279 3.75 5.25 5.65279 5.25 8V13.5001C5.25 17.228 8.27208 20.2501 12 20.2501C15.7279 20.2501 18.75 17.228 18.75 13.5001V12.0001C18.75 11.5859 19.0858 11.2501 19.5 11.2501C19.9142 11.2501 20.25 11.5859 20.25 12.0001V13.5001C20.25 18.0564 16.5563 21.7501 12 21.7501C7.44365 21.7501 3.75 18.0564 3.75 13.5001V8C3.75 4.82436 6.32436 2.25 9.5 2.25C12.6756 2.25 15.25 4.82436 15.25 8V13.5C15.25 15.2949 13.7949 16.75 12 16.75C10.2051 16.75 8.75 15.2949 8.75 13.5V9.5C8.75 9.08579 9.08579 8.75 9.5 8.75C9.91421 8.75 10.25 9.08579 10.25 9.5V13.5C10.25 14.4665 11.0335 15.25 12 15.25C12.9665 15.25 13.75 14.4665 13.75 13.5V8C13.75 5.65279 11.8472 3.75 9.5 3.75Z"
        fill="#020F52"
      />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.8029 13.0897L9.80288 13.0896L8.02961 11.0735C7.15174 10.0754 7.04779 9.63681 7.10554 9.54226L7.77109 9.00624L10.4686 6.89628C10.6861 6.72615 10.7245 6.41191 10.5544 6.1944C10.3843 5.97689 10.07 5.93848 9.85253 6.10861L7.15216 8.22073L6.34009 8.88355C6.15052 9.08701 6.02962 9.43495 6.16147 9.92972C6.28453 10.3915 6.62968 11.0017 7.36459 11.8396L7.09316 12.3748C6.91786 12.6185 6.7551 12.8447 6.6053 12.9998C6.45646 13.1539 6.18601 13.3804 5.80932 13.3054C5.43759 13.2315 5.27077 12.9241 5.18818 12.7269C5.1043 12.5266 5.03326 12.255 4.95618 11.9602L4.62184 10.6826C4.43614 9.97294 4.37201 9.76896 4.25117 9.61882C4.23592 9.59987 4.22003 9.58156 4.20355 9.56391C4.07597 9.42731 3.8958 9.34325 3.23583 9.0787L3.19968 9.06421C2.54928 8.80352 2.01354 8.58879 1.63882 8.37781C1.27579 8.17341 0.883764 7.87625 0.838665 7.37487C0.831655 7.29695 0.831776 7.21852 0.839024 7.14062C0.885665 6.63934 1.27866 6.34344 1.64233 6.14025C2.01771 5.93051 2.55412 5.71755 3.20531 5.45903L3.20532 5.45903L11.1947 2.28701C12.0119 1.96253 12.6802 1.6972 13.2052 1.57623C13.7406 1.4529 14.2936 1.43984 14.7269 1.84067C15.1517 2.23359 15.2025 2.78712 15.1496 3.34498C15.0971 3.89847 14.9244 4.61828 14.7114 5.5062L13.0983 12.2309C12.9626 12.7969 12.848 13.2747 12.7105 13.6214C12.5717 13.9716 12.349 14.3478 11.8991 14.4667C11.4437 14.5871 11.0674 14.3627 10.7814 14.1206C10.5005 13.8829 10.1801 13.5186 9.8029 13.0897Z"
        fill="white"
      />
    </svg>
  );
}

function ReplyArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.24935 4.0835L2.33398 7.00016L5.24935 9.91683"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.666 7H2.625"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmptyRepliesIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.4"
        d="M20.1308 41.9077C21.4065 42.1474 22.7014 42.2675 24 42.2659C28.9628 42.2659 33.5038 40.5351 37 37.6698L9.43778 10C6.06626 13.4269 4 18.0436 4 23.1218C4 28.2014 6.06667 32.8168 9.43778 36.2419C10.18 36.996 10.6756 38.0263 10.4756 39.0868C10.1455 40.8206 9.39748 42.4379 8.30222 43.7858C11.1839 44.3221 14.1803 43.8392 16.75 42.4719C17.6584 41.9886 18.1125 41.7469 18.4331 41.6979C18.7536 41.6489 19.2127 41.7352 20.1308 41.9077Z"
        fill="#6B7280"
      />
      <path
        d="M24 5.5C20.9919 5.5 18.157 6.18357 15.6523 7.39323C14.9063 7.75351 14.0095 7.44083 13.6493 6.69485C13.289 5.94887 13.6017 5.05207 14.3476 4.69179C17.2535 3.28835 20.5339 2.5 24 2.5C35.8095 2.5 45.5 11.6768 45.5 23.1334C45.5 26.5935 44.6112 29.8567 43.0427 32.7205C42.6447 33.4471 41.7331 33.7136 41.0065 33.3156C40.2799 32.9177 40.0135 32.006 40.4115 31.2795C41.7464 28.8421 42.5 26.0726 42.5 23.1334C42.5 13.4575 34.2793 5.5 24 5.5Z"
        fill="#6B7280"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.93934 2.93934C3.52513 2.35355 4.47487 2.35355 5.06066 2.93934L45.0607 42.9393C45.6464 43.5251 45.6464 44.4749 45.0607 45.0607C44.4749 45.6464 43.5251 45.6464 42.9393 45.0607L37.2516 39.373C33.481 42.2005 28.8028 43.7555 23.9831 43.7555H23.943C22.5616 43.7555 21.1801 43.6357 19.8186 43.3759C19.6629 43.3491 19.5116 43.3223 19.3711 43.2974C18.9876 43.2295 18.6852 43.176 18.5973 43.176C18.5753 43.187 18.5202 43.216 18.4402 43.2581C18.2286 43.3695 17.8429 43.5725 17.436 43.7755C15.3138 44.8946 12.9512 45.4742 10.5887 45.4742L10.6488 45.4941C9.76781 45.4941 8.90688 45.4142 8.04595 45.2543C7.52539 45.1544 7.08492 44.7947 6.90473 44.2951C6.72453 43.7955 6.82465 43.236 7.14499 42.8363C8.086 41.6772 8.72669 40.2984 9.00699 38.7996C9.08708 38.3399 8.84681 37.7804 8.36629 37.2808C4.58223 33.4439 2.5 28.408 2.5 23.1123C2.5 18.1751 4.30987 13.481 7.62135 9.74267L2.93934 5.06066C2.35355 4.47487 2.35355 3.52513 2.93934 2.93934ZM9.74433 11.8657C6.99197 15.0237 5.4832 18.9765 5.4832 23.1323C5.4832 27.6486 7.26511 31.9052 10.4886 35.1825C11.6698 36.3815 12.2104 37.9003 11.9301 39.3591C11.7299 40.4582 11.3695 41.4974 10.869 42.4966C12.6509 42.4566 14.4328 41.997 16.0145 41.1577C17.1157 40.5781 17.6162 40.3183 18.1768 40.2184C18.7374 40.1385 19.278 40.2184 20.3191 40.4183C21.5404 40.6581 22.7618 40.758 23.9631 40.758C27.9855 40.758 31.8922 39.5028 35.0964 37.2177L9.74433 11.8657Z"
        fill="#6B7280"
      />
    </svg>
  );
}
