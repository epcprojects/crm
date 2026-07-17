'use client';

import { useEffect, useRef } from 'react';
import { clearPersistedSession, useAppDispatch } from '../Redux/store';
import { fetchMyProfileThunk } from '../Redux/slices/auth/authThunks';
import {
  clearAuthState,
  hydrateAuthFromProfile,
} from '../Redux/slices/auth/authSlice';

function isAuthFailure(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('unauthorized') ||
    normalized.includes('token') ||
    normalized.includes('jwt') ||
    normalized.includes('session')
  );
}

export default function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const syncSession = async () => {
      const result = await dispatch(fetchMyProfileThunk());

      if (fetchMyProfileThunk.fulfilled.match(result)) {
        dispatch(hydrateAuthFromProfile(result.payload));
        return;
      }

      if (isAuthFailure(result.payload)) {
        dispatch(clearAuthState());
        await clearPersistedSession();
      }
    };

    void syncSession();
  }, [dispatch]);

  return null;
}
