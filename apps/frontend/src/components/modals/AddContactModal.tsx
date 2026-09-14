'use client';

import { useEffect } from 'react';
import { useFormik } from 'formik';
import { useQuery } from '@tanstack/react-query';
import * as yup from 'yup';
import AppModal from './AppModal';
import ThemeInput from '../ui/ThemeInput';
import Dropdown from '../ui/ThemeDropDown';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';
import { fetchCitiesByProvince, fetchProvinces } from '../../lib/territories';

export type AddContactFormValues = {
  fullName: string;
  phone: string;
  email: string;
  provinceId: string;
  territoryId: string;
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
  provinceId: '',
  territoryId: '',
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
      provinceId: yup.string().optional(),
      territoryId: yup.string().optional(),
      source: yup.string().optional(),
      notes: yup.string().optional(),
    }),
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

  const { resetForm, setFieldValue } = formik;

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const provincesQuery = useQuery({
    queryKey: ['territories', 'provinces'],
    queryFn: fetchProvinces,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const citiesQuery = useQuery({
    queryKey: ['territories', 'cities', formik.values.provinceId],
    queryFn: () => fetchCitiesByProvince(formik.values.provinceId),
    enabled: isOpen && Boolean(formik.values.provinceId),
    staleTime: 5 * 60 * 1000,
  });

  const provinceOptions = (provincesQuery.data ?? []).map((province) => ({
    label: province.name,
    value: province.id,
  }));
  const cityOptions = (citiesQuery.data ?? []).map((city) => ({
    label: city.name,
    value: city.id,
  }));

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Dropdown
            label="Province"
            options={provinceOptions}
            value={formik.values.provinceId}
            onChange={(value) => {
              setFieldValue('provinceId', value);
              setFieldValue('territoryId', '');
            }}
            placeholder={
              provincesQuery.isLoading ? 'Loading...' : 'Select province'
            }
            showSearch
          />

          <Dropdown
            label="City"
            options={cityOptions}
            value={formik.values.territoryId}
            onChange={(value) => setFieldValue('territoryId', value)}
            placeholder={
              !formik.values.provinceId
                ? 'Select province first'
                : citiesQuery.isLoading
                  ? 'Loading...'
                  : 'Select city'
            }
            disabled={!formik.values.provinceId}
            showSearch
          />
        </div>

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
