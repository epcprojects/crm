'use client';

import { useEffect } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';
import { appToast } from '../toast/AppToast';

export type AddContactFormValues = {
  fullName: string;
  phone: string;
  email: string;
  source: string;
  notes: string;
};

type AddContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (values: AddContactFormValues) => Promise<void> | void;
  mode?: 'create' | 'edit';
  initialValues?: AddContactFormValues;
};

const emptyValues: AddContactFormValues = {
  fullName: '',
  phone: '',
  email: '',
  source: '',
  notes: '',
};

export default function AddContactModal({
  isOpen,
  onClose,
  onConfirm,
  mode = 'create',
  initialValues,
}: AddContactModalProps) {
  const { setLoading } = useAppLoader();

  const formik = useFormik<AddContactFormValues>({
    initialValues: initialValues ?? emptyValues,
    enableReinitialize: true,
    validationSchema: yup.object({
      fullName: yup.string().optional(),
      phone: yup
        .string()
        .required('Phone number is required')
        .matches(/^[0-9+\-\s()]{6,30}$/, 'Enter a valid phone number'),
      email: yup.string().email('Enter a valid email').optional(),
      source: yup.string().optional(),
      notes: yup.string().optional(),
    }),
    onSubmit: async (values, { resetForm, setFieldError }) => {
      try {
        setLoading(true);
        await onConfirm?.(values);
        resetForm();
        onClose();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to save contact.';

        if (/already exists/i.test(message)) {
          setFieldError('phone', message);
        } else {
          appToast.error(message);
        }
      } finally {
        setLoading(false);
      }
    },
  });

  const { resetForm } = formik;

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Contact' : 'Add Contact'}
      showFooter
      confirmLabel={
        formik.isSubmitting
          ? mode === 'edit'
            ? 'Saving...'
            : 'Creating...'
          : mode === 'edit'
            ? 'Save Changes'
            : 'Create Contact'
      }
      cancelLabel="Cancel"
      onCancel={onClose}
      onConfirm={() => formik.submitForm()}
      confimBtnDisable={formik.isSubmitting}
      scrollNeeded
      roundedCustom
      outSideClickClose={false}
      size="medium"
    >
      <div className="space-y-4 p-4 md:p-5">
        <ThemeInput
          label="Full Name"
          name="fullName"
          value={formik.values.fullName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.fullName ? formik.errors.fullName : ''}
          placeholder="Enter full name"
        />

        <ThemeInput
          label="Phone"
          name="phone"
          value={formik.values.phone}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.phone ? formik.errors.phone : ''}
          placeholder="Enter phone number"
          required
        />

        <ThemeInput
          label="Email"
          name="email"
          type="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.email ? formik.errors.email : ''}
          placeholder="Enter email address"
        />

        <ThemeInput
          label="Source"
          name="source"
          value={formik.values.source}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          errorText={formik.touched.source ? formik.errors.source : ''}
          placeholder="e.g. Social Media, Referral, Walk-in"
        />

        <div>
          <label className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base">
            Notes
          </label>
          <textarea
            name="notes"
            value={formik.values.notes}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Enter any additional notes"
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-transparent px-3.5 py-2 text-sm font-medium text-gray-700 outline-none placeholder:text-gray-300 focus:border-gray-400 md:text-base"
          />
        </div>
      </div>
    </AppModal>
  );
}
