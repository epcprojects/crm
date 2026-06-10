'use client';

import ThemeButton from '../ui/ThemeButton';
import { PlusIcon, SearchIcon } from '../../../public/icons';
export type ProjectFileRecord = {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'file';
  size?: string;
  uploadedBy?: string;
  uploadedAt?: string;
};

type ProjectFilesPanelProps = {
  files: ProjectFileRecord[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onUploadClick?: () => void;
  title?: string;
  subtitle?: string;
};

export default function ProjectFilesPanel({
  files,
  searchValue,
  onSearchChange,
  onUploadClick,
  title = 'Project Files',
  subtitle = 'Internal team only',
}: ProjectFilesPanelProps) {
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

      <div className="overflow-hidden rounded-xl sm:rounded-2xl flex-1 border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 py-3">
          <h3 className="text-sm md:text-base font-semibold text-gray-900">
            {title}
          </h3>
          <p className="text-sm text-gray-900">{subtitle}</p>
        </div>

        <div className="min-h-138.5">
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
                  {(file.size || file.uploadedBy || file.uploadedAt) && (
                    <p className="mt-1 text-xs md:text-sm text-gray-900">
                      {[
                        file.size,
                        file.uploadedBy && `Uploaded by ${file.uploadedBy}`,
                        file.uploadedAt,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                </div>
              </div>
              <ThemeButton
                variant="secondary"
                className="sm:inline-block hidden"
              >
                <div>
                  <span className="sm:inline-block hidden">Download</span>
                </div>
              </ThemeButton>
              <button className="inline-block sm:hidden">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  width={24}
                  height={24}
                  fill="currentColor"
                >
                  <path
                    stroke="currentColor"
                    d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM308.7 411.3C314.9 417.5 325.1 417.5 331.3 411.3L403.3 339.3C409.5 333.1 409.5 322.9 403.3 316.7C397.1 310.5 386.9 310.5 380.7 316.7L336 361.4L336 240C336 231.2 328.8 224 320 224C311.2 224 304 231.2 304 240L304 361.4L259.3 316.7C253.1 310.5 242.9 310.5 236.7 316.7C230.5 322.9 230.5 333.1 236.7 339.3L308.7 411.3z"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
