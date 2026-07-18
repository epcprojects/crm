'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormik } from 'formik';
import { useQuery } from '@tanstack/react-query';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import Dropdown from '../ui/ThemeDropDown';
import { type CreateTicketDropdownOption } from './create-ticket-modal.data';
import { CloseIcon, FileTypePlaceholder } from '../../../public/icons';
import { useAppSelector } from '../../app/Redux/store';
import { appToast } from '../toast/AppToast';
import {
  ALLOWED_ATTACHMENT_ACCEPT,
  ALLOWED_ATTACHMENT_HELPER_TEXT,
  validateAttachments,
} from '../../lib/attachments';
import { useIsMobile } from '../hooks/useIsMobile';

export type CreateTicketFormValues = {
  project: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  attachments: File[];
};

const MAX_DESCRIPTION_LENGTH = 4000;

type CreateTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: CreateTicketFormValues) => Promise<void> | void;
  projectOptions: CreateTicketDropdownOption[];
  preselectedProjectId?: string;
  disableProjectSelection?: boolean;
};

export default function CreateTicketModal({
  isOpen,
  onClose,
  onConfirm,
  projectOptions,
  preselectedProjectId,
  disableProjectSelection = false,
}: CreateTicketModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userType = useAppSelector((state) => state.auth.user?.userType);
  const isExternalUser = userType === 'EXTERNAL';
  const [isDragOver, setIsDragOver] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const createTicketSchema = useMemo(
    () =>
      yup.object({
        project: yup.string().required('Project is required'),
        title: yup.string().required('Title is required'),
        description: yup
          .string()
          .max(
            MAX_DESCRIPTION_LENGTH,
            `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
          )
          .optional(),
        status: yup.string().required('Status is required'),
        priority: yup.string().optional(),
        dueDate: yup
          .string()
          .test(
            'not-in-past',
            'Due date cannot be less than current date',
            (value) => !value || value >= getTodayInputValue(),
          )
          .optional(),
      }),
    [isExternalUser],
  );

  const formik = useFormik<CreateTicketFormValues>({
    initialValues: {
      project: preselectedProjectId ?? projectOptions[0]?.value ?? '',
      title: '',
      description: '',
      status: '',
      priority: '',
      dueDate: '',
      attachments: [],
    },
    enableReinitialize: true,
    validationSchema: createTicketSchema,
    onSubmit: async (values, { resetForm }) => {
      await onConfirm?.(values);
      resetForm();
      onClose();
    },
  });

  const ticketStatusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
  });
  const ticketPrioritiesQuery = useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: fetchTicketPriorities,
  });

  const statusOptions = useMemo(
    () =>
      (ticketStatusesQuery.data ?? []).map((status) => ({
        label: status.label,
        value: status.key,
        icon: (
          <span
            className="inline-block h-2.25 w-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
        ),
      })),
    [ticketStatusesQuery.data],
  );
  const openStatusValue = useMemo(
    () =>
      statusOptions.find(
        (option) =>
          option.value.trim().toLowerCase() === 'open' ||
          option.label.trim().toLowerCase() === 'open',
      )?.value ??
      statusOptions[0]?.value ??
      '',
    [statusOptions],
  );

  const priorityOptions = useMemo(
    () =>
      (ticketPrioritiesQuery.data ?? []).map((priority) => ({
        label: priority.label,
        value: priority.key,
        icon: (
          <span
            className="inline-block h-2.25 w-2.5 rounded-full"
            style={{ backgroundColor: priority.color }}
          />
        ),
      })),
    [ticketPrioritiesQuery.data],
  );

  useEffect(() => {
    if (!isOpen) {
      formik.resetForm();
      setIsDragOver(false);
      setAttachmentError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedProjectId) {
      formik.setFieldValue('project', preselectedProjectId);
    }
  }, [preselectedProjectId]);

  useEffect(() => {
    if (isExternalUser) {
      if (formik.values.status !== openStatusValue) {
        formik.setFieldValue('status', openStatusValue);
      }

      if (formik.values.priority) {
        formik.setFieldValue('priority', '');
      }

      return;
    }

    if (!formik.values.status && statusOptions[0]?.value) {
      formik.setFieldValue('status', statusOptions[0].value);
    }
  }, [formik.values.status, isExternalUser, openStatusValue, statusOptions]);

  const setAttachments = (files: FileList | File[]) => {
    const currentFiles = formik.values.attachments;
    const nextFiles = mergeAttachmentFiles(currentFiles, Array.from(files));

    const validationError = validateAttachments(nextFiles);

    if (validationError) {
      setAttachmentError(validationError);
      appToast.error(validationError);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

    const addedFilesCount = nextFiles.length - currentFiles.length;

    setAttachmentError('');
    formik.setFieldValue('attachments', nextFiles);

    if (addedFilesCount === 1) {
      const addedFile = nextFiles[nextFiles.length - 1];

      appToast.success(`${addedFile.name} added successfully.`);
    } else if (addedFilesCount > 1) {
      appToast.success(`${addedFilesCount} files added successfully.`);
    } else {
      appToast.info('This file has already been added.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (fileName: string) => {
    const nextAttachments = formik.values.attachments.filter(
      (file) => file.name !== fileName,
    );
    formik.setFieldValue('attachments', nextAttachments);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const isMobile = useIsMobile();
  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Ticket"
      showFooter
      confirmLabel="Create Ticket"
      cancelLabel="Cancel"
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confimBtnDisable={formik.isSubmitting}
      roundedCustom
      outSideClickClose={false}
      size="extraLarge"
      scrollNeeded ={isMobile?true:false}
    >
      {/* space-y-4 p-4 md:p-5 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 divide-x divide-gray-200">
        <div className="space-y-4 p-4 md:p-5">
          <Dropdown
            label="Project"
            required
            options={projectOptions}
            value={formik.values.project}
            onChange={(value) => formik.setFieldValue('project', value)}
            error={Boolean(formik.touched.project && formik.errors.project)}
            errorMessage={formik.touched.project ? formik.errors.project : ''}
            disabled={disableProjectSelection}
          />

          <ThemeInput
            label="Title"
            required
            name="title"
            value={formik.values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            errorText={formik.touched.title ? formik.errors.title : ''}
            placeholder="Enter ticket title"
          />

          <div className="w-full">
            <label className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base">
              Description
            </label>
            <textarea
              name="description"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Describe the issue in detail..."
              rows={4}
              maxLength={MAX_DESCRIPTION_LENGTH}
              className="w-full  rounded-lg border border-gray-200 bg-transparent px-3.5 py-2 text-sm font-medium text-gray-700 outline-none placeholder:text-gray-300 focus:border-gray-400 md:text-base"
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-xs text-red-600">
                {formik.touched.description && formik.errors.description
                  ? formik.errors.description
                  : ''}
              </p>
              <p className="shrink-0 text-xs text-gray-500">
                {formik.values.description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isExternalUser ? null : (
              <Dropdown
                label="Status"
                required
                options={statusOptions}
                value={formik.values.status}
                onChange={(value) => formik.setFieldValue('status', value)}
                error={Boolean(formik.touched.status && formik.errors.status)}
                errorMessage={formik.touched.status ? formik.errors.status : ''}
              />
            )}

            {/* {isExternalUser ? null : ( */}
            <Dropdown
              label="Priority"
              options={priorityOptions}
              value={formik.values.priority}
              onChange={(value) => formik.setFieldValue('priority', value)}
              error={Boolean(formik.touched.priority && formik.errors.priority)}
              errorMessage={
                formik.touched.priority ? formik.errors.priority : ''
              }
              placeholder="Select priority"
            />
            {/* )} */}
          </div>

          <ThemeInput
            label="Due Date (optional)"
            type="date"
            name="dueDate"
            value={formik.values.dueDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            min={getTodayInputValue()}
            errorText={formik.touched.dueDate ? formik.errors.dueDate : ''}
          />
        </div>
        <div className="w-full p-5 space-y-3">
          <label className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base">
            Attachments (optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept={ALLOWED_ATTACHMENT_ACCEPT}
            onChange={(event) => {
              if (event.target.files) setAttachments(event.target.files);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragOver(false);
              if (event.dataTransfer.files?.length) {
                setAttachments(event.dataTransfer.files);
              }
            }}
            className={`flex min-h-28 w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${
              isDragOver
                ? 'border-primary-dark bg-violet-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="mb-3 flex h-8.5 w-8.5 md:h-10 md:w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500">
              <UploadIcon />
            </span>
            <div>
              <span className="text-sm font-bold text-primary">
                Click to upload
              </span>
              <span className="text-sm text-gray-500 ps-2">
                or drag and drop
              </span>
            </div>
            <span className="mt-1 text-xs text-gray-700">
              {ALLOWED_ATTACHMENT_HELPER_TEXT}
            </span>
          </button>

          {/* {formik.values.attachments.length ? (
            <div className="mt-3  grid grid-cols-2 gap-2">
              {formik.values.attachments.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <p className="truncate text-xs text-gray-500">{file.name}</p>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(file.name)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
                    aria-label={`Remove ${file.name}`}
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          ) : null} */}
          {formik.values.attachments.length ? (
  <div className="mt-3 grid max-h-103 min-h-0 grid-cols-1 gap-2 overflow-y-auto overscroll-contain pr-1 scrollbar-hide sm:grid-cols-2">
    {formik.values.attachments.map((file) => (
      <div
        key={`${file.name}-${file.size}-${file.lastModified}`}
        className="flex min-w-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-0.5 pr-2 pl-0.5"
      >
        <LocalAttachmentPreview file={file} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-700">
            {file.name}
          </p>

          <p className="text-xs text-gray-500">
            {formatAttachmentSize(file.size)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleRemoveAttachment(file.name)}
          className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full transition hover:bg-gray-100"
          aria-label={`Remove ${file.name}`}
        >
          <CloseIcon  />
        </button>
      </div>
    ))}
  </div>
) : null}

          {attachmentError ? (
            <p className="mt-2 text-xs text-red-600">{attachmentError}</p>
          ) : null}
        </div>
      </div>
    </AppModal>
  );
}

type ApiTicketStatus = {
  id: string;
  key: string;
  label: string;
  color: string;
};

type ApiTicketPriority = ApiTicketStatus & {
  sortOrder: number;
};
function AttachmentFileIcon({ extension }: { extension?: string }) {
  const label = normalizeAttachmentExtension(extension);
  const badgeClassName = getAttachmentBadgeClassName(label);

  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      <FileTypePlaceholder />

      <span
        className={`absolute top-4 rounded-xs px-1 py-0.75 text-[9px] font-bold uppercase leading-none text-white ${badgeClassName}`}
      >
        {label}
      </span>
    </span>
  );
}

function getFileExtension(fileName: string, mimeType?: string) {
  const extension = fileName.split('.').pop();

  if (extension && extension !== fileName) {
    return extension;
  }

  return mimeType?.split('/').pop() ?? 'file';
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

function getAttachmentBadgeClassName(extension: string) {
  if (extension === 'PDF') return 'bg-red-500';

  if (extension === 'DOC' || extension === 'DOCX') {
    return 'bg-blue-600';
  }

  if (extension === 'XLS' || extension === 'XLSX') {
    return 'bg-green-600';
  }

  if (['PNG', 'JPG', 'JPEG', 'SVG'].includes(extension)) {
    return 'bg-violet-500';
  }

  if (extension === 'ZIP') {
    return 'bg-gray-600';
  }

  return 'bg-[#10175A]';
}

function formatAttachmentSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}
function LocalAttachmentPreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState('');

  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isImage]);

  if (isImage && previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={file.name}
        className="h-8 w-8 shrink-0 rounded-md border border-gray-200 object-cover"
      />
    );
  }

  return (
    <AttachmentFileIcon extension={getFileExtension(file.name, file.type)} />
  );
}
async function fetchTicketStatuses() {
  const response = await fetch('/api/ticket-statuses', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketStatus[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket statuses.'
        : 'Failed to fetch ticket statuses.',
    );
  }

  return payload;
}

async function fetchTicketPriorities() {
  const response = await fetch('/api/ticket-priorities', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketPriority[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket priorities.'
        : 'Failed to fetch ticket priorities.',
    );
  }

  return payload
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

export function UploadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.6252 11.6666C10.6252 12.0118 10.3454 12.2916 10.0002 12.2916C9.65503 12.2916 9.3752 12.0118 9.3752 11.6666V4.61498L9.37015 4.62093C9.19458 4.82813 9.02267 5.04711 8.86191 5.25188L8.82465 5.29934C8.66446 5.50328 8.49593 5.71754 8.36505 5.8522C8.12446 6.09972 7.72877 6.10535 7.48125 5.86476C7.23373 5.62418 7.22811 5.22849 7.46869 4.98097C7.54261 4.90492 7.66397 4.75341 7.84163 4.52722L7.88082 4.4773C8.03921 4.27551 8.22504 4.03877 8.41648 3.81284C8.62165 3.57071 8.8513 3.31922 9.08086 3.1237C9.1959 3.02572 9.32556 2.92908 9.46506 2.85443C9.59959 2.78244 9.78497 2.70825 10.0002 2.70825C10.2154 2.70825 10.4008 2.78244 10.5354 2.85443C10.6748 2.92908 10.8045 3.02572 10.9195 3.1237C11.1491 3.31922 11.3788 3.57071 11.5839 3.81284C11.7754 4.03876 11.9611 4.27545 12.1195 4.47722L12.1588 4.52722C12.3364 4.75341 12.4578 4.90492 12.5317 4.98097C12.7723 5.22849 12.7667 5.62418 12.5192 5.86476C12.2716 6.10535 11.8759 6.09972 11.6354 5.8522C11.5045 5.71754 11.3359 5.50328 11.1758 5.29934L11.1385 5.25187C10.9777 5.0471 10.8058 4.82813 10.6303 4.62093L10.6252 4.61498V11.6666Z"
        fill="#374151"
      />
      <path
        d="M18.0895 11.8746C18.2044 11.5491 18.0337 11.1921 17.7082 11.0772C17.3827 10.9623 17.0257 11.1331 16.9108 11.4586L16.7159 12.0107C16.332 13.0986 16.0604 13.8653 15.7816 14.44C15.5097 15.0005 15.2568 15.321 14.9413 15.5442C14.6259 15.7674 14.2395 15.8991 13.6205 15.969C12.9857 16.0407 12.1723 16.0416 11.0187 16.0416H8.98164C7.82799 16.0416 7.0146 16.0407 6.37984 15.969C5.76086 15.8991 5.37447 15.7674 5.059 15.5442C4.74353 15.321 4.49069 15.0005 4.21879 14.44C3.93995 13.8653 3.66837 13.0986 3.28441 12.0107L3.08954 11.4586C2.97466 11.1331 2.61766 10.9623 2.29216 11.0772C1.96666 11.1921 1.79592 11.5491 1.9108 11.8746L2.11812 12.462C2.48678 13.5066 2.78096 14.3401 3.09416 14.9856C3.41781 15.6528 3.78722 16.1756 4.33704 16.5646C4.88685 16.9536 5.50283 17.1279 6.23962 17.2111C6.95261 17.2916 7.83652 17.2916 8.94422 17.2916H11.0561C12.1638 17.2916 13.0477 17.2916 13.7607 17.2111C14.4975 17.1279 15.1135 16.9536 15.6633 16.5646C16.2131 16.1756 16.5825 15.6527 16.9062 14.9856C17.2194 14.3401 17.5136 13.5066 17.8822 12.462L18.0895 11.8746Z"
        fill="#374151"
      />
    </svg>
  );
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function mergeAttachmentFiles(currentFiles: File[], newFiles: File[]) {
  const fileMap = new Map<string, File>();

  [...currentFiles, ...newFiles].forEach((file) => {
    fileMap.set(getAttachmentFileKey(file), file);
  });

  return Array.from(fileMap.values());
}

function getAttachmentFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
