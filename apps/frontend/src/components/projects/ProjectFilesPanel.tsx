'use client';

import ThemeButton from '../ui/ThemeButton';
import {
  EyeOpenedIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '../../../public/icons';
export type ProjectFileRecord = {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'file';
  size?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  storageKey?: string;
};

type ProjectFilesPanelProps = {
  files: ProjectFileRecord[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onUploadClick?: () => void;
  onDeleteFile?: (file: ProjectFileRecord) => void;
  deletingFileId?: string;
  title?: string;
  subtitle?: string;
};

export default function ProjectFilesPanel({
  files,
  searchValue,
  onSearchChange,
  onUploadClick,
  onDeleteFile,
  deletingFileId,
  title = 'Project Files',
  subtitle = 'Internal team only',
}: ProjectFilesPanelProps) {
  const handleViewFile = (storageKey?: string) => {
    const fileUrl = getFileUrl(storageKey);

    if (!fileUrl) {
      return;
    }

    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 flex flex-col flex-1">
      <div className="flex flex-col gap-3 rounded-2xl md:flex-row md:items-center md:justify-between">
        <div className="relative flex w-full items-center md:max-w-xs">
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            className="h-10.5 w-full rounded-lg border border-gray-200 bg-white ps-7 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <span className="absolute start-2">
            <SearchIcon />
          </span>
        </div>

        <ThemeButton icon={<PlusIcon />} onClick={onUploadClick}>
          Upload File
        </ThemeButton>
      </div>

      <div className="flex min-h-0 max-h-[calc(100dvh-360px)] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 py-3">
          <h3 className="text-sm md:text-base font-semibold text-gray-900">
            {title}
          </h3>
          <p className="text-sm text-gray-900">{subtitle}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between border-b border-gray-200 px-4 py-4 last:border-b-0"
            >
              <div className="flex items-center gap-4">
                <FileTypeIcon type={file.type} />
                <div>
                  <p className="text-sm md:text-base leading-[1.2] font-medium text-gray-900">
                    {file.name}
                  </p>
                  {(file.size || file.uploadedAt) && (
                    <p className="mt-1 text-xs md:text-sm text-gray-900">
                      {[file.size, file.uploadedAt].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <ThemeButton
                  variant="secondary"
                  className="sm:flex hidden h-9 w-9 items-center justify-center"
                  onClick={() => handleViewFile(file.storageKey)}
                  disabled={!getFileUrl(file.storageKey)}
                >
                  <EyeOpenedIcon />
                </ThemeButton>
                {onDeleteFile ? (
                  <button
                    type="button"
                    onClick={() => onDeleteFile(file)}
                    disabled={deletingFileId === file.id}
                    className="rounded-lg bg-red-50 h-9 w-9 flex items-center justify-center text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {/* {deletingFileId === file.id ? 'Deleting...' : 'Delete'} */}
                    <TrashIcon />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className="inline-block disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
                onClick={() => handleViewFile(file.storageKey)}
                disabled={!getFileUrl(file.storageKey)}
                aria-label={`View ${file.name}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width={24}
                  height={24}
                  fill="none"
                >
                  <path
                    d="M2.25 12C3.75 7.75 7.25 5.25 12 5.25C16.75 5.25 20.25 7.75 21.75 12C20.25 16.25 16.75 18.75 12 18.75C7.25 18.75 3.75 16.25 2.25 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 15.25C13.7949 15.25 15.25 13.7949 15.25 12C15.25 10.2051 13.7949 8.75 12 8.75C10.2051 8.75 8.75 10.2051 8.75 12C8.75 13.7949 10.2051 15.25 12 15.25Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
              {onDeleteFile ? (
                <button
                  type="button"
                  className="ms-2 inline-block rounded-lg bg-[#F04438] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 sm:hidden"
                  onClick={() => onDeleteFile(file)}
                  disabled={deletingFileId === file.id}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getFileUrl(storageKey?: string) {
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
  const badgeClassName =
    type === 'pdf'
      ? 'bg-[#F04438]'
      : type === 'docx'
        ? 'bg-[#3165F6]'
        : 'bg-gray-500';

  return (
    <div className="relative h-11 w-8 shrink-0">
      <svg
        width="32"
        height="44"
        viewBox="0 0 32 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        <path
          d="M6 1.5H18.9645L26 8.53553V40C26 41.3807 24.8807 42.5 23.5 42.5H6C4.61929 42.5 3.5 41.3807 3.5 40V4C3.5 2.61929 4.61929 1.5 6 1.5Z"
          fill="white"
          stroke="#D0D5DD"
        />
        <path d="M19 1.5V7C19 8.10457 19.8954 9 21 9H26.5" fill="#F8FAFC" />
        <path d="M19 1.5V7C19 8.10457 19.8954 9 21 9H26.5" stroke="#D0D5DD" />
      </svg>
      <span
        className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${badgeClassName}`}
      >
        {label}
      </span>
    </div>
  );
}
