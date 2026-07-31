'use client';

import { useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import Dropdown from '../ui/ThemeDropDown';
import type { ProjectNameRecord } from '../../app/(main-pages)/projects/projects.data';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { EditLockedIcon } from 'apps/frontend/public/icons';

export type AddUserType = 'internal' | 'external';

export type AddUserFormValues = {
  fullName: string;
  email: string;
  userType: AddUserType;
  role: string;
  projectAccess: string[];
};

type AddUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: AddUserFormValues) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initialValues?: AddUserFormValues;
  projects?: ProjectNameRecord[];
  roleOptions?: Array<{ label: string; value: string }>;
};

const addUserSchema = yup.object({
  fullName: yup.string().required('Full name is required'),
  email: yup
    .string()
    .email('Enter a valid email address')
    .required('Email is required'),
  userType: yup
    .mixed<AddUserType>()
    .oneOf(['internal', 'external'])
    .required('User type is required'),
  role: yup.string().required('Role is required'),
  projectAccess: yup
    .array()
    .of(yup.string().required())
    .min(1, 'Select at least one project'),
});

export default function AddUserModal({
  isOpen,
  onClose,
  onConfirm,
  mode = 'create',
  initialValues,
  projects = [],
  roleOptions = [],
}: AddUserModalProps) {
  const formik = useFormik<AddUserFormValues>({
    initialValues: initialValues ?? {
      fullName: '',
      email: '',
      userType: 'internal',
      role: roleOptions[0]?.value ?? '',
      projectAccess: [],
    },
    enableReinitialize: true,
    validationSchema: addUserSchema,
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

  useEffect(() => {
    if (isOpen && !formik.values.role && roleOptions[0]?.value) {
      formik.setFieldValue('role', roleOptions[0].value);
    }
  }, [formik.values.role, formik.values.userType, isOpen, roleOptions]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit User' : 'Add User'}
      showFooter
      confirmLabel={mode === 'edit' ? 'Save Changes' : 'Create User'}
      cancelLabel="Cancel"
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confimBtnDisable={formik.isSubmitting}
      scrollNeeded={false}
      roundedCustom
      outSideClickClose={false}
      size="medium"
    >
      <div className="space-y-4 p-4 md:p-5 overflow-y-auto max-h-[calc(100vh-200px)]">
        <ThemeInput
          autoFocus
          label="Full Name"
          name="fullName"
          value={formik.values.fullName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.fullName ? formik.errors.fullName : ''}
          placeholder="Enter full name"
        />

        {mode === 'edit' ? (
          <div>
            <p className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base">
              Email
            </p>
            <p className="rounded-lg flex flex-row justify-between items-center  bg-gray-100 px-3.5 py-2 text-sm font-medium text-gray-500 md:text-base">
              {formik.values.email || '-'}
              <EditLockedIcon />
            </p>
          </div>
        ) : (
          <ThemeInput
            label="Email"
            name="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            errorText={formik.touched.email ? formik.errors.email : ''}
            placeholder="Enter email address"
          />
        )}

        <div className="space-y-2">
          <label className="block text-sm font-normal text-gray-800 md:text-base">
            User Type
          </label>

          <div
            className={`grid grid-cols-1 gap-3 ${
              mode === 'create' ? 'md:grid-cols-2' : ''
            }`}
          >
            {(mode === 'create' || formik.values.userType === 'internal') && (
              <UserTypeCard
                title="Internal"
                description="Devs & PMs — full project access"
                isSelected={formik.values.userType === 'internal'}
                disabled={mode === 'edit'}
                onClick={() => {
                  void formik.setFieldValue('userType', 'internal');

                  if (!formik.values.role) {
                    void formik.setFieldValue(
                      'role',
                      roleOptions[0]?.value ?? '',
                    );
                  }
                }}
              />
            )}

            {(mode === 'create' || formik.values.userType === 'external') && (
              <UserTypeCard
                title="External"
                description="Clients — limited to their tickets + calendar"
                isSelected={formik.values.userType === 'external'}
                disabled={mode === 'edit'}
                onClick={() => {
                  void formik.setFieldValue('userType', 'external');

                  if (!formik.values.role) {
                    void formik.setFieldValue(
                      'role',
                      roleOptions[0]?.value ?? '',
                    );
                  }
                }}
              />
            )}
          </div>
        </div>

        <Dropdown
          label="Role"
          options={roleOptions}
          value={formik.values.role}
          onChange={(value) => formik.setFieldValue('role', value)}
          error={Boolean(formik.touched.role && formik.errors.role)}
          errorMessage={formik.touched.role ? formik.errors.role : ''}
        />

        <div className="space-y-2">
          <label className="block text-sm font-normal text-gray-800 md:text-base">
            Project Access
          </label>

          <div className="flex flex-wrap gap-2">
            {projects.map((project) => {
              const isSelected = formik.values.projectAccess.includes(
                project.id,
              );
              const initials = project.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase();

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    const nextProjects = isSelected
                      ? formik.values.projectAccess.filter(
                          (projectId) => projectId !== project.id,
                        )
                      : [...formik.values.projectAccess, project.id];

                    formik.setFieldValue('projectAccess', nextProjects);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition ${
                    isSelected
                      ? ''
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: '#A78BFA',
                          color: '#7C3AED',
                          backgroundColor: '#F5F3FF',
                        }
                      : undefined
                  }
                >
                  {/* <span>{initials || 'PR'}</span> */}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      isSelected
                        ? 'bg-violet-200 text-violet-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {initials || 'PR'}
                  </span>
                  <span>{project.name}</span>
                  <span className="text-base leading-none">
                    {isSelected ? '×' : '+'}
                  </span>
                </button>
              );
            })}
          </div>

          {formik.errors.projectAccess ? (
            <p className="text-xs text-red-600">
              {String(formik.errors.projectAccess)}
            </p>
          ) : null}
        </div>
      </div>
    </AppModal>
  );
}

function UserTypeCard({
  title,
  description,
  isSelected,
  disabled = false,
  onClick,
}: {
  title: string;
  description: string;
  isSelected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border p-3 text-left transition ${
        disabled
          ? 'cursor-not-allowed border-0 bg-gray-100'
          : isSelected
            ? 'border-primary bg-violet-50 shadow-[inset_0_0_0_1px_#7F56D9]'
            : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${
              disabled ? 'text-gray-500' : 'text-gray-900'
            }`}
          >
            {title}
          </p>

          <p
            className={`mt-1 text-xs ${
              disabled ? 'text-gray-500' : 'text-gray-700'
            }`}
          >
            {description}
          </p>
        </div>

        {disabled ? (
          <span className="shrink-0">
            <EditLockedIcon />
          </span>
        ) : null}
      </div>
    </button>
  );
}
