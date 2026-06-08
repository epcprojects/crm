'use client';

import { useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';

export type CreateProjectFormValues = {
  name: string;
  category: string;
  colorHex: string;
};

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: CreateProjectFormValues) => Promise<void> | void;
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
}: CreateProjectModalProps) {
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const formik = useFormik<CreateProjectFormValues>({
    initialValues: {
      name: '',
      category: '',
      colorHex: '#17B26A',
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
    }
  }, [isOpen]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Project"
      showFooter
      confirmLabel="Create Project"
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
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                    isSelected ? 'border-white ring-2' : 'border-transparent'
                  }`}
                  style={isSelected ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
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
    </AppModal>
  );
}
