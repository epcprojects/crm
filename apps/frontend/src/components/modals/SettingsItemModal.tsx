'use client';

import { useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';

export type SettingsItemModalKind = 'status' | 'priority';
export type SettingsItemModalMode = 'create' | 'edit';

export type SettingsItemFormValues = {
  label: string;
  value: string;
  colorHex: string;
};

type SettingsItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  kind: SettingsItemModalKind;
  mode?: SettingsItemModalMode;
  initialValues?: SettingsItemFormValues;
  onConfirm?: (values: SettingsItemFormValues) => Promise<void> | void;
};

const configColors = [
  '#F79009',
  '#0BA5EC',
  '#17B26A',
  '#6172F3',
  '#875BF7',
  '#D444F1',
  '#667085',
  '#F04438',
];

const settingsItemSchema = yup.object({
  label: yup.string().required('Label is required'),
  value: yup.string().required('Key is required'),
  colorHex: yup
    .string()
    .matches(/^#([0-9A-Fa-f]{6})$/, 'Enter a valid hex color like #17B26A')
    .required('Color is required'),
});

export default function SettingsItemModal({
  isOpen,
  onClose,
  kind,
  mode = 'create',
  initialValues,
  onConfirm,
}: SettingsItemModalProps) {
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const formik = useFormik<SettingsItemFormValues>({
    initialValues:
      initialValues ?? {
        label: '',
        value: '',
        colorHex: '#17B26A',
      },
    enableReinitialize: true,
    validationSchema: settingsItemSchema,
    onSubmit: async (values, { resetForm }) => {
      await onConfirm?.(values);
      resetForm();
      onClose();
    },
  });

  useEffect(() => {
    formik.setFieldValue('value', slugifyLabel(formik.values.label), false);
  }, [formik.values.label]);

  useEffect(() => {
    if (!isOpen) {
      formik.resetForm();
    }
  }, [isOpen]);

  const itemLabel = kind === 'status' ? 'Status' : 'Priority';
  const confirmLabel =
    mode === 'edit' ? `Save Changes` : `Create ${itemLabel}`;
  const title = mode === 'edit' ? `Edit ${itemLabel}` : `Add ${itemLabel}`;
  const previewLabel =
    formik.values.label || (kind === 'status' ? 'Resolved' : 'Priority Label');

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
      scrollNeeded={false}
      roundedCustom
      outSideClickClose={false}
      size="medium"
    >
      <div className="space-y-4 p-4 md:p-5">
        <ThemeInput
          label="Label"
          name="label"
          value={formik.values.label}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.label ? formik.errors.label : ''}
          placeholder={
            kind === 'status'
              ? 'e.g. Blocked, Under Review'
              : 'e.g. Urgent, Trivial'
          }
        />

        <ThemeInput
          label="Key (used internally — auto-generated)"
          name="value"
          value={formik.values.value}
          readOnly
          inputClassName="text-gray-500"
        />

        <div className="space-y-2">
          <label className="block text-sm font-normal text-gray-800 md:text-base">
            Color
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {configColors.map((color) => {
              const isSelected =
                formik.values.colorHex.toLowerCase() === color.toLowerCase();

              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => formik.setFieldValue('colorHex', color)}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
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
            <div className="w-full rounded-lg border border-gray-200 px-3">
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

        <div className="space-y-2">
          <label className="block text-sm font-normal text-gray-800 md:text-base">
            Preview
          </label>

          <div className="rounded-lg bg-gray-50 px-3 py-3">
            <PreviewBadge
              label={previewLabel}
              colorHex={formik.values.colorHex}
              showDot={kind === 'priority'}
            />
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function PreviewBadge({
  label,
  colorHex,
  showDot,
}: {
  label: string;
  colorHex: string;
  showDot: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border text-sm ${
        showDot
          ? 'rounded-md px-2 py-1 font-semibold shadow-xs'
          : 'rounded-full px-2.5 py-1 font-medium'
      }`}
      style={
        showDot
          ? {
              color: '#344054',
              backgroundColor: '#FFFFFF',
              borderColor: '#D0D5DD',
            }
          : {
              color: colorHex,
              backgroundColor: `${colorHex}12`,
              borderColor: `${colorHex}55`,
            }
      }
    >
      {showDot ? (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: colorHex }}
        />
      ) : null}
      {label}
    </span>
  );
}

function slugifyLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
