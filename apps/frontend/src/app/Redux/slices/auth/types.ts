export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  permissions: string[];
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    contact?: string;
    normalizedName?: string;
    isActive?: boolean;
    status?: string;
    organizationBalance?: number | string | null;
  } | null;
};

export type UserRole =
  | string
  | {
  id: string;
  key: string;
  name: string;
};

export type SignInRequest = {
  email: string;
  password: string;
};

export type registerRequest = {
  email: string;
  otp: string;
};

export type SignInSuccessResponse = {
  user: UserProfile;
};

export type AuthState = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
};
