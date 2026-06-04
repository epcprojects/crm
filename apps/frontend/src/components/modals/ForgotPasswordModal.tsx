'use client';

import { useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';
import { LockIcon } from '../../../public/icons';

export type ForgotPasswordFormValues = {
  email: string;
};

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: ForgotPasswordFormValues) => Promise<void> | void;
};

const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Enter a valid email address')
    .required('Email address is required'),
});

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onConfirm,
}: ForgotPasswordModalProps) {
  const { setLoading } = useAppLoader();

  const formik = useFormik<ForgotPasswordFormValues>({
    initialValues: {
      email: '',
    },
    validationSchema: forgotPasswordSchema,
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
    if (!isOpen) formik.resetForm();
  }, [isOpen]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Forgot Password"
      subtitle="Enter your account email to continue."
      icon={<LockIcon />}
      showFooter
      confirmLabel={formik.isSubmitting ? 'Sending...' : 'Continue'}
      cancelLabel="Cancel"
      size="small"
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confimBtnDisable={formik.isSubmitting}
      scrollNeeded={false}
      roundedCustom
      outSideClickClose={false}
    >
      <div className="p-3 md:p-5">
        <ThemeInput
          type="email"
          required
          label="Email Address"
          name="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.email ? formik.errors.email : ''}
          placeholder="Enter email address"
        />
      </div>
    </AppModal>
  );
}
