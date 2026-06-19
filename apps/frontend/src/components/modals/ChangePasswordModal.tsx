'use client';

import { useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import { LockIcon } from '../../../public/icons';

export type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: ChangePasswordFormValues) => Promise<void> | void;
};

const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Confirm password is required'),
});

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onConfirm,
}: ChangePasswordModalProps) {
  const formik = useFormik<ChangePasswordFormValues>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: changePasswordSchema,
    onSubmit: async (values, { resetForm }) => {
      await onConfirm?.(values);
      resetForm();
      onClose();
    },
  });

  useEffect(() => {
    if (!isOpen) formik.resetForm();
  }, [isOpen]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      subtitle="Update your account password."
      icon={<LockIcon />}
      showFooter
      confirmLabel="Update Password"
      cancelLabel="Cancel"
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confimBtnDisable={formik.isSubmitting}
      scrollNeeded={false}
      roundedCustom
      outSideClickClose={false}
    >
      <div className="p-3 md:p-5 space-y-4">
        <ThemeInput
          label="Current Password"
          type="password"
          name="currentPassword"
          value={formik.values.currentPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={
            formik.touched.currentPassword ? formik.errors.currentPassword : ''
          }
          placeholder="Enter current password"
        />

        <ThemeInput
          label="Password"
          type="password"
          name="newPassword"
          value={formik.values.newPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={
            formik.touched.newPassword ? formik.errors.newPassword : ''
          }
          placeholder="Enter new password"
        />

        <ThemeInput
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formik.values.confirmPassword}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={
            formik.touched.confirmPassword ? formik.errors.confirmPassword : ''
          }
          placeholder="Re-enter new password"
        />
      </div>
    </AppModal>
  );
}
