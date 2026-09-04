'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import { CloseIcon, FileTypePlaceholder } from '../../../public/icons';
import { UploadIcon } from './CreateTicketModal';
import { appToast } from '../toast/AppToast';
import {
  ALLOWED_ATTACHMENT_ACCEPT,
  ALLOWED_ATTACHMENT_HELPER_TEXT,
  validateAttachments,
} from '../../lib/attachments';

export type CreateProjectFormValues = {
  name: string;
  category: string;
  colorHex: string;
  attachments: File[];
};

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: CreateProjectFormValues) => Promise<void> | void;
  initialValues?: CreateProjectFormValues;
  title?: string;
  confirmLabel?: string;
};

const projectColors = [
  '#F79009',
  '#0BA5EC',
  '#17B26A',
  '#6172F3',
  '#875BF7',
  '#D444F1',
  '#667085',
  '#F04438',
];

const createProjectSchema = yup.object({
  name: yup.string().required('Project name is required'),
  category: yup.string().required('Category is required'),
  colorHex: yup
    .string()
    .matches(/^#([0-9A-Fa-f]{6})$/, 'Enter a valid hex color like #17B26A')
    .required('Project color is required'),
});

export default function CreateProjectModal({
  isOpen,
  onClose,
  onConfirm,
  initialValues,
  title = 'Create Project',
  confirmLabel = 'Create Project',
}: CreateProjectModalProps) {
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const showAttachments = !initialValues;

  const formik = useFormik<CreateProjectFormValues>({
    initialValues: {
      name: '',
      category: '',
      colorHex: '#17B26A',
      attachments: [],
    },
    validationSchema: createProjectSchema,
    onSubmit: async (values, { resetForm }) => {
      await onConfirm?.(values);
      resetForm();
      onClose();
    },
  });

  useEffect(() => {
    if (!isOpen) {
      formik.resetForm();
      setIsDragOver(false);
      setAttachmentError('');
      return;
    }

    if (initialValues) {
      formik.resetForm({
        values: { ...initialValues, attachments: initialValues.attachments ?? [] },
      });
    }
  }, [initialValues, isOpen]);

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
      appToast.success(`${nextFiles[nextFiles.length - 1].name} added successfully.`);
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
    formik.setFieldValue(
      'attachments',
      formik.values.attachments.filter((file) => file.name !== fileName),
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      showFooter
      confirmLabel={confirmLabel}
      cancelLabel="Cancel"
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confimBtnDisable={formik.isSubmitting}
      scrollNeeded={showAttachments}
      roundedCustom
      outSideClickClose={false}
      size={showAttachments ? 'extraLarge' : 'medium'}
    >
      <div
        className={`grid grid-cols-1 ${
          showAttachments ? 'divide-x divide-gray-200 xl:grid-cols-2' : ''
        }`}
      >
        <div className="space-y-4 p-4 md:p-5">
        <ThemeInput
          label="Project Name"
          name="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.name ? formik.errors.name : ''}
          placeholder="Enter project name"
        />

        <ThemeInput
          label="Category"
          name="category"
          value={formik.values.category}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.category ? formik.errors.category : ''}
          placeholder="Enter category"
        />

        <div className="space-y-2">
          <label className="block text-sm font-normal text-gray-800 md:text-base">
            Project Color
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {projectColors.map((color) => {
              const isSelected =
                formik.values.colorHex.toLowerCase() === color.toLowerCase();

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => formik.setFieldValue('colorHex', color)}
                  className={`flex h-7 min-w-7 items-center justify-center rounded-full border-2 transition ${
                    isSelected ? 'border-white ring-2' : 'border-transparent'
                  }`}
                  style={
                    isSelected ? { boxShadow: `0 0 0 2px ${color}` } : undefined
                  }
                  aria-label={`Select color ${color}`}
                >
                  <span
                    className="h-6.5 w-6.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 bg-white">
            <input
              ref={colorInputRef}
              type="color"
              value={formik.values.colorHex}
              onChange={(event) =>
                formik.setFieldValue('colorHex', event.target.value)
              }
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className="h-7 w-7 shrink-0 rounded-full"
              style={{ backgroundColor: formik.values.colorHex }}
              aria-label="Open color picker"
            />
            <div className="rounded-lg border border-gray-200 w-full px-3">
              <input
                name="colorHex"
                value={formik.values.colorHex}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="#17B26A"
                className="h-10.5 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>

          {formik.touched.colorHex && formik.errors.colorHex ? (
            <p className="text-xs text-red-600">{formik.errors.colorHex}</p>
          ) : null}
        </div>
        </div>

        {showAttachments ? (
          <div className="w-full space-y-3 p-5">
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
            <span className="mb-3 flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 md:h-10 md:w-10">
              <UploadIcon />
            </span>
            <div>
              <span className="text-sm font-bold text-primary">Click to upload</span>
              <span className="ps-2 text-sm text-gray-500">or drag and drop</span>
            </div>
            <span className="mt-1 text-xs text-gray-700">
              {ALLOWED_ATTACHMENT_HELPER_TEXT}
            </span>
          </button>

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
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {attachmentError ? (
            <p className="mt-2 text-xs text-red-600">{attachmentError}</p>
          ) : null}
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}

function AttachmentFileIcon({ extension }: { extension?: string }) {
  const label = normalizeAttachmentExtension(extension);

  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      <FileTypePlaceholder />
      <span className="absolute top-4 rounded-xs bg-[#10175A] px-0.75 pt-0.75 pb-0.5 text-[7.5px] font-bold uppercase leading-none! text-white">
        {label}
      </span>
    </span>
  );
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

    return () => URL.revokeObjectURL(objectUrl);
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

  return <AttachmentFileIcon extension={getFileExtension(file.name, file.type)} />;
}

function getFileExtension(fileName: string, mimeType?: string) {
  const extension = fileName.split('.').pop();

  return extension && extension !== fileName
    ? extension
    : (mimeType?.split('/').pop() ?? 'file');
}

function normalizeAttachmentExtension(extension?: string) {
  const normalizedExtension = (extension ?? 'file')
    .replace(/^svg\+xml$/i, 'svg')
    .replace(/^application\//i, '')
    .replace(/^image\//i, '')
    .trim()
    .toUpperCase();

  return (normalizedExtension === 'JPEG' ? 'JPG' : normalizedExtension).slice(
    0,
    4,
  ) || 'FILE';
}

function formatAttachmentSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mergeAttachmentFiles(currentFiles: File[], newFiles: File[]) {
  const fileMap = new Map<string, File>();

  [...currentFiles, ...newFiles].forEach((file) => {
    fileMap.set(`${file.name}-${file.size}-${file.lastModified}`, file);
  });

  return Array.from(fileMap.values());
}
