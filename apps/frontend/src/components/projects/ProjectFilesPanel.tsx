'use client';

import ThemeButton from '../ui/ThemeButton';
import {
  DownloadIcon,
  EyeOpenedIcon,
  FileTypePlaceholder,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '../../../public/icons';
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

        {onUploadClick ? (
          <ThemeButton icon={<PlusIcon />} onClick={onUploadClick}>
            Upload File
          </ThemeButton>
        ) : null}
      </div>

      <div className="flex min-h-0 max-h-[calc(100dvh-360px)] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 py-3">
          <h3 className="text-sm md:text-sm font-semibold text-gray-900">
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
                {file.extension === 'png' ||
                file.extension === 'svg' ||
                file.extension === 'jpg' ||
                file.extension === 'svg+xml' ||
                file.extension === 'jpeg' ? (
                  <img
                    className="rounded-sm h-10 w-10  border border-gray-200"
                    src={getFileUrl(file.storageKey)}
                  />
                ) : (
                  <FileTypeIcon type={file.extension ?? file.type} />
                )}
                <div className="">
                  <p
                    onClick={() => handleViewFile(file.storageKey)}
                    className="text-sm cursor-pointer  truncate sm:w-full w-36 line-clamp-1 leading-[1.2] font-semibold text-gray-900"
                  >
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {file.size && (
                      <p className="mt-1 text-xs md:text-xs text-gray-700">
                        {[file.size].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <span className="inline-block mt-1 h-1 w-1 rounded-full bg-gray-400"></span>
                    {file.uploadedAt && (
                      <p className="mt-1 text-xs md:text-xs text-gray-700">
                        {[file.uploadedAt].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <span className="inline-block mt-1 h-1 w-1 rounded-full bg-gray-400"></span>

                    {getFileMetadataItems(file).map((item) => (
                      <div
                        key={`${file.id}-${item.label}`}
                        className={`mt-1 rounded-full  py-0.5 px-2 flex max-w-3xl flex-wrap gap-3 gap-y-1 text-xs border ${item.value === 'Thread' ? 'text-[#5925DC] bg-[#F4F3FF] border-[#D9D6FE]' : 'text-[#026AA2] bg-[#F0F9FF] border-[#B9E6FE]'}`}
                      >
                        <span key={`${file.id}-${item.label}`}>
                          <span className="font-medium">{item.label}</span>{' '}
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canDownloadFile ? (
                  <ThemeButton
                    variant="secondary"
                    className=" bg-white! hover:bg-gray-100! h-9 w-9 items-center justify-center"
                    onClick={() => handleDownloadFile(file)}
                    disabled={!file.storageKey}
                  >
                    <DownloadIcon />
                  </ThemeButton>
                ) : null}
                <ThemeButton
                  variant="secondary"
                  className=" bg-white! hover:bg-gray-100! h-9 w-9 items-center justify-center"
                  onClick={() => handleViewFile(file.storageKey)}
                  disabled={!getFileUrl(file.storageKey)}
                >
                  <EyeOpenedIcon />
                </ThemeButton>

                {onDeleteFile && (
                  <ThemeButton
                    variant="secondary"
                    className=" bg-white! hover:bg-red-50! h-9 w-9 items-center justify-center"
                    onClick={() => onDeleteFile(file)}
                    disabled={deletingFileId === file.id}
                  >
                    <TrashIcon />
                  </ThemeButton>
                )}
              </div>
              {/* <button
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
              ) : null} */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getFileMetadataItems(file: ProjectFileRecord) {
  return [
    { label: 'From', value: formatFileSource(file.source) },
    // { label: 'Status', value: file.status },
    // { label: 'Type', value: file.mimeType ?? file.extension },
    // { label: 'Uploaded by', value: file.uploadedBy },
    // { label: 'Source ID', value: file.sourceId },
  ].filter(
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
  // const badgeClassName =
  //   type === 'pdf'
  //     ? 'bg-[#F04438]'
  //     : type === 'docx'
  //       ? 'bg-[#3165F6]'
  //       : 'bg-gray-500';

  return (
    // <div className="relative h-11 w-8 shrink-0">
    //   <svg
    //     width="32"
    //     height="44"
    //     viewBox="0 0 32 44"
    //     fill="none"
    //     xmlns="http://www.w3.org/2000/svg"
    //     className="absolute inset-0"
    //   >
    //     <path
    //       d="M6 1.5H18.9645L26 8.53553V40C26 41.3807 24.8807 42.5 23.5 42.5H6C4.61929 42.5 3.5 41.3807 3.5 40V4C3.5 2.61929 4.61929 1.5 6 1.5Z"
    //       fill="white"
    //       stroke="#D0D5DD"
    //     />
    //     <path d="M19 1.5V7C19 8.10457 19.8954 9 21 9H26.5" fill="#F8FAFC" />
    //     <path d="M19 1.5V7C19 8.10457 19.8954 9 21 9H26.5" stroke="#D0D5DD" />
    //   </svg>
    //   <span
    //     className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${badgeClassName}`}
    //   >
    //     {label}
    //   </span>
    // </div>
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
