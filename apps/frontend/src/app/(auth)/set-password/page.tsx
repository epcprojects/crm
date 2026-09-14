'use client';

import Image from 'next/image';
import React from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useRouter, useSearchParams } from 'next/navigation';
import { Images } from '../../ui/images';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import { appToast } from '../../../components/toast/AppToast';
import ThemeInput from '../../../components/ui/ThemeInput';
import ThemeButton from '../../../components/ui/ThemeButton';

type SetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

const setPasswordSchema = yup.object({
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoading } = useAppLoader();

  const token = searchParams.get('token')?.trim() || '';
  const mode = searchParams.get('mode')?.trim() || 'reset';
  const isInviteMode = mode === 'invite';

  const formik = useFormik<SetPasswordFormValues>({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema: setPasswordSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);

        if (!token) {
          appToast.error('Reset token is missing or invalid.');
          return;
        }

        const response = await fetch(
          isInviteMode ? '/api/auth/accept-invite' : '/api/auth/reset-password',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(
              isInviteMode
                ? {
                    token,
                    password: values.password,
                  }
                : {
                    token,
                    newPassword: values.password,
                    confirmPassword: values.confirmPassword,
                  },
            ),
          },
        );

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          appToast.error(
            result?.message ||
              (isInviteMode
                ? 'Failed to complete invite setup.'
                : 'Failed to reset password.'),
          );
          return;
        }

        appToast.success(
          isInviteMode
            ? 'Password set successfully. Please sign in.'
            : 'Password reset successfully. Please sign in.',
        );
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 p-3 bg-white flex-1 md:min-h-[calc(100dvh-32px)] min-h-[calc(100dvh-16px)] rounded-3xl md:rounded-4xl">
      <div className="md:p-8 flex flex-col relative items-center justify-center w-full">
        <Image
          alt="harper tech help logo"
          className="md:absolute mb-4 top-2 left-2 md:left-4 md:top-4"
          src={Images.auth.NewLogo}
        />
        <div className="md:flex-1 max-w-117 w-full flex items-center justify-center flex-col">
          <div className="space-y-2">
            <h2 className="text-black text-xl md:text-2xl font-bold text-center">
              Set a password
            </h2>
            <h3 className="text-gray-500 text-sm mb-8 md:mb-10.5 md:text-base font-medium text-center">
              Create a password for your account.
            </h3>
          </div>

          <form
            onSubmit={formik.handleSubmit}
            className="w-full space-y-8 md:space-y-12"
          >
            <div className="space-y-6">
              <ThemeInput
                type="password"
                required
                label="Password"
                name="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                errorText={
                  formik.touched.password ? formik.errors.password : ''
                }
                placeholder="Password"
              />

              <ThemeInput
                type="password"
                required
                label="Confirm Password"
                name="confirmPassword"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                errorText={
                  formik.touched.confirmPassword
                    ? formik.errors.confirmPassword
                    : ''
                }
                placeholder="Password"
              />
            </div>

            <div className="space-y-3">
              <ThemeButton
                type="submit"
                disabled={formik.isSubmitting}
                className="w-full"
                size="lg"
              >
                {formik.isSubmitting ? 'Setting password...' : 'Set password'}
              </ThemeButton>
            </div>
          </form>
        </div>
      </div>

      <div className=" rounded-3xl hidden md:flex items-center justify-center bg-[url('/images/HarperLoginBg.jpg')] bg-center bg-no-repeat backdrop-blur-3xl relative">
        <Image
          alt="harper tech help logo"
          className="top-0 end-0 w-80 absolute"
          src={Images.auth.NewLogoTransparent2}
        />
        <div className="flex-1 flex items-center space-y-8 md:space-y-12 px-4  justify-center flex-col">
          <div className="max-w-160 w-full space-y-3">
            <h2 className="text-white font-bold text-4xl md:text-[36px] text-center">
              Streamline Support Operations
            </h2>
            <h3 className="text-center text-white text-base md:text-lg">
              A smarter way to manage leads, projects, and team collaboration
              across organizations.
            </h3>
          </div>

          <div className="md:px-10">
            <Image alt="" src={Images.index.loginMockup} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
