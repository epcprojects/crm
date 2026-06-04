import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchMyProfileThunk,
  logoutThunk,
  registerThunk,
  signInThunk,
} from './authThunks';
import type { AuthState, UserProfile } from './types';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrateAuthFromProfile: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.status = 'succeeded';
      state.error = null;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    clearAuthState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signInThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(signInThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Login failed.';
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Login failed.';
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = 'idle';
        state.error = null;
      })

      .addCase(logoutThunk.rejected, (state, action) => {
        state.error = action.payload ?? 'Logout failed.';
      })
      .addCase(fetchMyProfileThunk.pending, (state) => {
        if (!state.isAuthenticated) {
          state.status = 'loading';
        }
        state.error = null;
      })
      .addCase(fetchMyProfileThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMyProfileThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unable to fetch profile.';
      });
  },
});

export const { hydrateAuthFromProfile, clearAuthError, clearAuthState } =
  authSlice.actions;
export default authSlice.reducer;
