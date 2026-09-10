'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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

export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const hasRunRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const syncSession = async () => {
      // Persisted user data is not proof that the session cookie is still valid.
      dispatch(clearAuthState());
      const result = await dispatch(fetchMyProfileThunk());

      if (fetchMyProfileThunk.fulfilled.match(result)) {
        dispatch(hydrateAuthFromProfile(result.payload));
        setIsReady(true);
        return;
      }

      if (isAuthFailure(result.payload)) {
        dispatch(clearAuthState());
        await clearPersistedSession().catch(() => undefined);
      }
      setIsReady(true);
    };

    void syncSession();
  }, [dispatch]);

  return isReady ? <>{children}</> : null;
}
