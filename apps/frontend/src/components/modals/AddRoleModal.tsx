'use client';

import { useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';

export type AddRoleFormValues = {
  name: string;
  description: string;
};

type AddRoleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: AddRoleFormValues) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initialValues?: AddRoleFormValues;
};

const addRoleSchema = yup.object({
  name: yup.string().required('Role name is required'),
  description: yup.string().required('Description is required'),
});

export default function AddRoleModal({
  isOpen,
  onClose,
  onConfirm,
  mode = 'create',
  initialValues,
}: AddRoleModalProps) {
  const { setLoading } = useAppLoader();

  const formik = useFormik<AddRoleFormValues>({
    initialValues: initialValues ?? {
      name: '',
      description: '',
    },
    enableReinitialize: true,
    validationSchema: addRoleSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        setLoading(true);
        await onConfirm?.(values);
        resetForm();
        onClose();
      } finally {
        setLoading(false);
      }
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
      title={mode === 'edit' ? 'Edit Role' : 'Add Role'}
      showFooter
      confirmLabel={
        formik.isSubmitting
          ? mode === 'edit'
            ? 'Saving...'
            : 'Creating...'
          : mode === 'edit'
            ? 'Save Changes'
            : 'Create Role'
      }
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
          label="Role Name"
          name="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.name ? formik.errors.name : ''}
          placeholder="Enter role name"
        />

        <div>
          <label className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Enter role description"
            rows={4}
            className={`w-full rounded-lg border bg-transparent px-3.5 py-2 text-sm font-medium text-gray-700 outline-none placeholder:text-gray-300 focus:border-gray-400 md:text-base ${
              formik.touched.description && formik.errors.description
                ? 'border-red-300 focus:border-red-400'
                : 'border-gray-200'
            }`}
          />
          {formik.touched.description && formik.errors.description ? (
            <p className="mt-1 text-xs text-red-600">
              {formik.errors.description}
            </p>
          ) : null}
        </div>

      </div>
    </AppModal>
  );
}
