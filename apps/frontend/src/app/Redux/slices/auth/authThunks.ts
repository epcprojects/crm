import { createAsyncThunk } from '@reduxjs/toolkit';
import type {
  registerRequest,
  SignInRequest,
  SignInSuccessResponse,
  UserProfile,
} from './types';

type RejectValue = string;

function toNumberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toUserProfile(payload: any): UserProfile | null {
  const candidate = payload?.user ?? payload;
  if (!candidate?.id || !candidate?.email || !candidate?.fullName) return null;

  const organizations = Array.isArray(candidate.organization)
    ? candidate.organization
    : candidate.organization
      ? [candidate.organization]
      : [];

  const organizationFromArray =
    organizations.find((org: any) => org?.id === candidate.organizationId) ||
    organizations[0] ||
    null;

  const organization = organizationFromArray ?? candidate.organization ?? null;
  const organizationBalance =
    toNumberOrNull(organization?.organizationBalance) ??
    toNumberOrNull(organization?.balance) ??
    toNumberOrNull(candidate?.organizationBalance);

  return {
    id: candidate.id,
    email: candidate.email,
    fullName: candidate.fullName,
    roles: Array.isArray(candidate.roles) ? candidate.roles : [],
    permissions: Array.isArray(candidate.permissions)
      ? candidate.permissions.filter(
          (permission: unknown): permission is string =>
            typeof permission === 'string',
        )
      : [],
    organizationId: candidate.organizationId || organization?.id,
    organization: organization
      ? {
          ...organization,
          organizationBalance,
        }
      : null,
  };
}

export const signInThunk = createAsyncThunk<
  SignInSuccessResponse,
  SignInRequest,
  { rejectValue: RejectValue }
>('auth/signIn', async (payload, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return rejectWithValue(
        data?.message || 'Unable to sign in. Please try again.',
      );
    }

    if (!data?.user) {
      return rejectWithValue('User data missing from login response.');
    }

    return data as SignInSuccessResponse;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Something went wrong.',
    );
  }
});

export const registerThunk = createAsyncThunk<
  SignInSuccessResponse,
  registerRequest,
  { rejectValue: RejectValue }
>('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return rejectWithValue(
        data?.message || 'Unable to sign in. Please try again.',
      );
    }

    if (!data?.user) {
      return rejectWithValue('User data missing from login response.');
    }

    return data as SignInSuccessResponse;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Something went wrong.',
    );
  }
});

export const logoutThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('auth/logout', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return rejectWithValue(data?.message || 'Logout failed.');
    }

    return;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Logout failed.',
    );
  }
});

export const fetchMyProfileThunk = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: string }
>('auth/fetchMyProfile', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch('/api/auth/user', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401) return rejectWithValue('Unauthorized');
      return rejectWithValue(data?.message || 'Unable to fetch profile.');
    }

    const profile = toUserProfile(data);
    if (!profile) {
      return rejectWithValue('Invalid profile response.');
    }

    return profile;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Unable to fetch profile.',
    );
  }
});
