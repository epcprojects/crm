'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { Images } from '../../ui/images';
import { CheckedBoxIcon, UncheckedBoxIcon } from '../../../../public/icons';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useAppDispatch, useAppSelector } from '../../Redux/store';
import {
  fetchMyProfileThunk,
  signInThunk,
} from '../../Redux/slices/auth/authThunks';
import {
  selectAuthError,
  selectAuthStatus,
} from '../../Redux/slices/auth/authSelectors';
import { appToast } from '../../../components/toast/AppToast';
import ThemeInput from '../../../components/ui/ThemeInput';
import ForgotPasswordModal from '../../../components/modals/ForgotPasswordModal';
import ThemeButton from '../../../components/ui/ThemeButton';

type LoginFormValues = {
  email: string;
  password: string;
};

const loginSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Enter a valid email address')
    .required('Email address is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

const Page = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const authStatus = useAppSelector(selectAuthStatus);
  const authError = useAppSelector(selectAuthError);
  const formik = useFormik<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      const result = await dispatch(
        signInThunk({
          email: values.email,
          password: values.password,
        }),
      );

      if (signInThunk.fulfilled.match(result)) {
        await dispatch(fetchMyProfileThunk());
        router.replace('/dashboard');
      }
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 p-3 bg-white flex-1 md:min-h-[calc(100dvh-32px)] min-h-[calc(100dvh-16px)] rounded-3xl md:rounded-4xl">
      <div className="md:p-8 flex flex-col relative items-center justify-center w-full">
        <Image
          alt="harper tech help logo"
          className="md:absolute mb-4 top-2 left-2 md:left-4 md:top-4"
          src={Images.index.logoWithText}
        />
        <div className="md:flex-1 max-w-117 w-full flex items-center justify-center flex-col">
          <h2 className="text-black text-xl mb-6 md:mb-8 md:text-2xl font-bold text-center">
            Welcome back 👋
          </h2>

          <form
            onSubmit={formik.handleSubmit}
            className="w-full space-y-6 md:space-y-8"
          >
            <div className="space-y-6">
              <ThemeInput
                type="email"
                required
                label="Email Address"
                name="email"
                className="py-2.5"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                errorText={formik.touched.email ? formik.errors.email : ''}
                placeholder="Enter email address"
              />

              <ThemeInput
                type="password"
                required
                label="Password"
                name="password"
                className="py-2.5"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                errorText={
                  formik.touched.password ? formik.errors.password : ''
                }
                placeholder="Password"
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-3">
                <ThemeButton
                  type="submit"
                  disabled={authStatus === 'loading'}
                  className="w-full"
                  size="lg"
                >
                  {authStatus === 'loading' ? 'Signing in...' : 'Sign in'}
                </ThemeButton>
                {authError && (
                  <p className="text-sm text-red-600 text-center">
                    {authError}
                  </p>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-primary text-sm hover:underline underline-offset-4 md:text-base font-medium"
                >
                  Forgot password
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="bg-linear-to-t rounded-3xl hidden md:flex items-center justify-center from-primary-dark via-[#6719FC] to-[#3165F6] backdrop-blur-3xl relative">
        <Image
          alt="harper tech help logo"
          className="top-0 end-0 w-80 absolute"
          src={Images.index.logoTransparent2}
        />
        <div className="flex-1 flex items-center space-y-8 md:space-y-12 px-4  justify-center flex-col">
          <div className="max-w-160 w-full space-y-3">
            <h2 className="text-white font-bold text-4xl md:text-[36px] text-center">
              Streamline Support Operations
            </h2>
            <h3 className="text-center text-white text-base md:text-lg">
              A smarter way to manage tickets, projects, and team collaboration
              across organizations.
            </h3>
          </div>

          <Image alt="" src={Images.index.loginMockup} />
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onConfirm={async (values) => {
          const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              email: values.email.trim(),
            }),
          });

          const payload = await response.json().catch(() => null);

          if (!response.ok) {
            const errorMessage =
              payload?.message || 'Failed to send reset password email.';
            appToast.error(errorMessage);
            throw new Error(errorMessage);
          }

          appToast.success('Password reset email sent successfully.');
        }}
      />
    </div>
  );
};

export default Page;
