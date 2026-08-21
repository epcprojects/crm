'use client';

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../Redux/store';
import { hydrateAuthFromProfile } from '../../Redux/slices/auth/authSlice';
import { appToast } from '../../../components/toast/AppToast';
import ThemeButton from '../../../components/ui/ThemeButton';
import ThemeInput from '../../../components/ui/ThemeInput';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';

const fallbackAccount = {
  id: '',
  fullName: 'Admin',
  email: 'admin@gmail.com',
  roles: ['Admin'],
};

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const account = user ?? fallbackAccount;
  const primaryRole = useMemo(() => {
    const role = account.roles?.[0];

    if (!role) {
      return 'Admin';
    }

    if (typeof role === 'string') {
      return role;
    }

    return role.name || role.key || 'Admin';
  }, [account.roles]);
  const [fullName, setFullName] = useState(account.fullName);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      appToast.error('Unable to update profile right now.');
      return;
    }

    const normalizedFullName = fullName.trim();

    if (!normalizedFullName) {
      appToast.error('Full name is required.');
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch('/api/users/myself', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fullName: normalizedFullName,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update profile.');
      }

      dispatch(hydrateAuthFromProfile(payload));
      setFullName(payload.fullName ?? normalizedFullName);
      appToast.success('Profile updated successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to update profile.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh overflow-hidden xl:py-5 px-4 xl:px-0 pt-2 pb-0 xl:pr-5">
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <div className="shrink-0">
            <DashboardSummaryBanner
              imageSrc="/images/RolesIconImage.svg"
              imageAlt="Roles"
              title="Roles"
              stats={[]}
            />
          </div>

          <section className="flex h-auto min-h-0 flex-none items-start justify-start w-full flex-col gap-4 overflow-visible rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:h-full xl:flex-1 xl:overflow-hidden">
            <form
              className=" flex w-full max-w-[800px] flex-col gap-5"
              onSubmit={handleSubmit}
            >
              <ProfileField
                label="Full Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                name="fullName"
                autoComplete="name"
              />

              <ProfileField
                label="Email Address"
                value={account.email}
                name="email"
                disabled
              />

              <ProfileField
                label="Role"
                value={formatRoleLabel(primaryRole)}
                name="role"
                disabled
              />
              <div className="flex justify-end pt-1">
                <ThemeButton
                  disabled={isSaving}
                  type="submit"
                  className="min-w-36"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </ThemeButton>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}

type ProfileFieldProps = {
  autoComplete?: string;
  disabled?: boolean;
  label: string;
  name: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
};

function ProfileField({
  autoComplete,
  disabled = false,
  label,
  name,
  onChange,
  value,
}: ProfileFieldProps) {
  return (
    <div className="grid gap-2 text-sm text-[#344054] xl:grid-cols-[170px_minmax(0,1fr)] xl:items-center xl:gap-6">
      <span className="font-medium">{label}</span>
      <ThemeInput
        autoComplete={autoComplete}
        className="py-2.5"
        disabled={disabled}
        name={name}
        onChange={onChange}
        placeholder={label}
        type="text"
        value={value}
      />
    </div>
  );
}

function ProfileHeroIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M19 20C19 16.6863 15.866 14 12 14C8.13401 14 5 16.6863 5 20"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function formatRoleLabel(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
