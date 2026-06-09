'use client';

import { useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';

export type AddRoleType = 'Internal' | 'External';

export type AddRoleFormValues = {
  name: string;
  type: AddRoleType;
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
  type: yup
    .mixed<AddRoleType>()
    .oneOf(['Internal', 'External'])
    .required('Role type is required'),
});

export default function AddRoleModal({
  isOpen,
  onClose,
  onConfirm,
  mode = 'create',
  initialValues,
}: AddRoleModalProps) {
  const formik = useFormik<AddRoleFormValues>({
    initialValues: initialValues ?? {
      name: '',
      type: 'Internal',
    },
    enableReinitialize: true,
    validationSchema: addRoleSchema,
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
      title={mode === 'edit' ? 'Edit Role' : 'Add Role'}
      showFooter
      confirmLabel={mode === 'edit' ? 'Save Changes' : 'Create Role'}
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

        <div className="space-y-2">
          <label className="block text-sm font-normal text-gray-800 md:text-base">
            Role Type
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <RoleTypeCard
              title="Internal"
              description="For admins, PMs, and developers"
              isSelected={formik.values.type === 'Internal'}
              onClick={() => formik.setFieldValue('type', 'Internal')}
            />

            <RoleTypeCard
              title="External"
              description="For clients and limited-access users"
              isSelected={formik.values.type === 'External'}
              onClick={() => formik.setFieldValue('type', 'External')}
            />
          </div>
        </div>
      </div>
    </AppModal>
  );
}

function RoleTypeCard({
  title,
  description,
  isSelected,
  onClick,
}: {
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${
        isSelected
          ? 'border-primary bg-violet-50 shadow-[inset_0_0_0_1px_#7F56D9]'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-700">{description}</p>
    </button>
  );
}
