'use client';

import { useMemo, useState } from 'react';
import ThemeButton from '../ui/ThemeButton';
import EmptyState from '../EmptyState';
import {
  CloseIcon,
  DownloadIcon,
  EyeOpenedIcon,
  FileTypePlaceholder,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '../../../public/icons';
import ImageGalleryLightbox from '../ui/ImageGalleryLightbox';

export type ProjectFileRecord = {
  id: string;
  name: string;
  type: string;
  size?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  storageKey?: string;
  extension?: string;
  mimeType?: string;
  source?: string;
  sourceId?: string;
  status?: string;
};

type ProjectFilesPanelProps = {
  files: ProjectFileRecord[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onUploadClick?: () => void;
  onDeleteFile?: (file: ProjectFileRecord) => void;
  canDownloadFile?: boolean;
  deletingFileId?: string;
  title?: string;
  subtitle?: string;
};

type GalleryImage = {
  storageKey?: string;
  fileName?: string;
  src: string;
  alt: string;
};

export default function ProjectFilesPanel({
  files,
  searchValue,
  onSearchChange,
  onUploadClick,
  onDeleteFile,
  canDownloadFile = true,
  deletingFileId,
  title = 'Project Files',
  subtitle = 'Internal team only',
}: ProjectFilesPanelProps) {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(
    null,
  );
  const imageFiles = useMemo(
    () =>
      files
        .filter((file) => isImageFile(file.extension))
        .map((file) => ({
          storageKey: file.storageKey,
          fileName: file.name,
          src: getFileUrl(file.storageKey),
          alt: file.name,
        }))
        .filter((file) => Boolean(file.src)),
    [files],
  );

  const handleViewFile = (storageKey?: string) => {
    const fileUrl = getFileUrl(storageKey);

    if (!fileUrl) {
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadFile = (file: ProjectFileRecord) => {
    if (!file.storageKey) {
      return;
    }

    const link = document.createElement('a');
    const searchParams = new URLSearchParams({
      storageKey: file.storageKey,
      fileName: file.name,
    });

    link.href = `/api/projects/files/download?${searchParams.toString()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewFile = (file: ProjectFileRecord) => {
    if (isImageFile(file.extension)) {
      const imageIndex = imageFiles.findIndex(
        (image) =>
          image.storageKey === file.storageKey && image.fileName === file.name,
      );

      if (imageIndex >= 0) {
        setGalleryImages(imageFiles);
        setActiveGalleryIndex(imageIndex);
        return;
      }
    }

    handleViewFile(file.storageKey);
  };

  const closeGallery = () => {
    setActiveGalleryIndex(null);
    setGalleryImages([]);
  };

  const showPreviousGalleryImage = () => {
    setActiveGalleryIndex((current) =>
      current === null || !galleryImages.length
        ? null
        : (current - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  const showNextGalleryImage = () => {
    setActiveGalleryIndex((current) =>
      current === null || !galleryImages.length
        ? null
        : (current + 1) % galleryImages.length,
    );
  };

  return (
    <>
      <div className="flex flex-1 flex-col space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl md:flex-row md:items-center md:justify-between">
          <div className="relative flex w-full items-center md:max-w-xs">
            <span className="pointer-events-none absolute start-3 shrink-0">
              <SearchIcon />
            </span>

            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search..."
              className="h-10.5 w-full rounded-lg border border-gray-200 bg-white pe-10 ps-9 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />

            <button
              type="button"
              onClick={() => onSearchChange('')}
              disabled={!searchValue}
              tabIndex={searchValue ? 0 : -1}
              aria-label="Clear search"
              className={`absolute end-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                searchValue
                  ? 'visible hover:bg-gray-100'
                  : 'invisible pointer-events-none'
              }`}
            >
              <CloseIcon width="15" height="15" />
            </button>
          </div>

          {onUploadClick ? (
            <ThemeButton
              className="w-full justify-center md:w-auto"
              icon={<PlusIcon />}
              onClick={onUploadClick}
            >
              Upload File
            </ThemeButton>
          ) : null}
        </div>

        <div className="flex max-h-[calc(100dvh-360px)] min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 sm:px-4">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-900">{subtitle}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {files.length ? (
              files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handlePreviewFile(file)}
                  className="border-b cursor-pointer border-gray-200 px-3 py-4 last:border-b-0 sm:px-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                      {isImageFile(file.extension) ? (
                        <img
                          className="h-10 w-10 shrink-0 rounded-sm border border-gray-200"
                          src={getFileUrl(file.storageKey)}
                        />
                      ) : (
                        <div className="shrink-0">
                          <FileTypeIcon type={file.extension ?? file.type} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="w-full  truncate text-sm font-semibold leading-[1.2] text-gray-900">
                          {file.name}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700">
                          {file.size ? <p>{file.size}</p> : null}
                          {file.size && file.uploadedAt ? (
                            <span className="inline-block h-1 w-1 rounded-full bg-gray-400" />
                          ) : null}
                          {file.uploadedAt ? <p>{file.uploadedAt}</p> : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {getFileMetadataItems(file).map((item) => (
                            <div
                              key={`${file.id}-${item.label}`}
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                item.value === 'Thread'
                                  ? 'border-[#D9D6FE] bg-[#F4F3FF] text-[#5925DC]'
                                  : 'border-[#B9E6FE] bg-[#F0F9FF] text-[#026AA2]'
                              }`}
                            >
                              <span>
                                <span className="font-medium">
                                  {item.label}
                                </span>{' '}
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 sm:justify-start">
                      {canDownloadFile ? (
                        <ThemeButton
                          variant="secondary"
                          className="h-9 w-9 items-center justify-center bg-white! hover:bg-gray-100!"
                          onClick={(e) => {
                            handleDownloadFile(file);
                            e.stopPropagation();
                          }}
                          disabled={!file.storageKey}
                        >
                          <DownloadIcon />
                        </ThemeButton>
                      ) : null}

                      <ThemeButton
                        variant="secondary"
                        className="h-9 w-9 items-center justify-center bg-white! hover:bg-gray-100!"
                        onClick={(e) => {
                          handlePreviewFile(file);
                          e.stopPropagation();
                        }}
                        disabled={!getFileUrl(file.storageKey)}
                      >
                        <EyeOpenedIcon />
                      </ThemeButton>

                      {onDeleteFile ? (
                        <ThemeButton
                          variant="secondary"
                          className="h-9 w-9 items-center justify-center bg-white! hover:bg-red-50!"
                          onClick={(e) => {
                            onDeleteFile(file);
                            e.stopPropagation();
                          }}
                          disabled={deletingFileId === file.id}
                        >
                          <TrashIcon />
                        </ThemeButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex min-h-full items-center justify-center p-6">
                <EmptyState
                  imageUrl="/images/EmptyProjectIcon.svg"
                  imageAlt="No project files"
                  title="No Files"
                  description="No files have been uploaded to this project yet."
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <ImageGalleryLightbox
        images={galleryImages}
        activeIndex={activeGalleryIndex}
        title={title}
        onClose={closeGallery}
        onSelect={setActiveGalleryIndex}
        onPrevious={showPreviousGalleryImage}
        onNext={showNextGalleryImage}
      />
    </>
  );
}

function getFileMetadataItems(file: ProjectFileRecord) {
  return [{ label: 'From', value: formatFileSource(file.source) }].filter(
    (item): item is { label: string; value: string } =>
      typeof item.value === 'string' && item.value.trim().length > 0,
  );
}

function formatFileSource(source?: string) {
  const sourceLabels: Record<string, string> = {
    project: 'Project',
    thread: 'Thread',
    ticket: 'Ticket',
    ticket_reply: 'Ticket Reply',
  };

  return source ? (sourceLabels[source] ?? source) : undefined;
}

export function getFileUrl(storageKey?: string) {
  if (typeof storageKey === 'string' && /^https?:\/\//i.test(storageKey)) {
    return storageKey;
  }

  if (!storageKey) {
    return '';
  }

  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim() ?? '';
  const normalizedBaseUrl = cloudfrontUrl.replace(/\/+$/, '');
  const normalizedStorageKey = storageKey.replace(/^\/+/, '');

  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/${normalizedStorageKey}`
    : '';
}

function FileTypeIcon({ type }: { type: ProjectFileRecord['type'] }) {
  const label = type.toUpperCase();
  const badgeClassName = getAttachmentBadgeClassName(label);

  return (
    <span className="relative">
      <span
        className={`rounded-xs absolute top-4.5 px-0.75 pb-0.75 pt-1 text-[10px] font-bold uppercase leading-none! text-white ${badgeClassName}`}
      >
        {label}
      </span>
      <FileTypePlaceholder />
    </span>
  );
}

function getAttachmentBadgeClassName(extension: string) {
  if (extension.toLowerCase() === 'pdf') return 'bg-red-500';
  if (extension.toLowerCase() === 'doc' || extension.toLowerCase() === 'docx')
    return 'bg-blue-600';
  if (extension.toLowerCase() === 'xls' || extension.toLowerCase() === 'xlxs')
    return 'bg-green-600';
  if (['png', 'jpg', 'jpeg', 'svg'].includes(extension.toLowerCase()))
    return 'bg-violet-500';
  if (extension.toLowerCase() === 'zip') return 'bg-gray-600';
  return 'bg-[#10175A]';
}

function isImageFile(extension?: string) {
  const normalized = extension?.trim().toLowerCase();

  return (
    normalized === 'png' ||
    normalized === 'svg' ||
    normalized === 'jpg' ||
    normalized === 'svg+xml' ||
    normalized === 'jpeg'
  );
}
