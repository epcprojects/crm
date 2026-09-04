'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearPersistedSession, useAppDispatch, useAppSelector } from '../Redux/store';
import { selectIsAuthenticated } from '../Redux/slices/auth/authSelectors';
import { clearAuthState } from '../Redux/slices/auth/authSlice';

const DEFAULT_IDLE_TIMEOUT_HOURS = 3;
const IDLE_ACTIVITY_STORAGE_KEY = 'harperhelp:last-activity-at';
const ACTIVITY_SYNC_INTERVAL_MS = 30 * 1000;

function getIdleTimeoutMs() {
  const rawValue = process.env.NEXT_PUBLIC_IDLE_LOGOUT_HOURS?.trim();
  const parsedValue = Number(rawValue);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue * 60 * 60 * 1000;
  }

  return DEFAULT_IDLE_TIMEOUT_HOURS * 60 * 60 * 1000;
}

export default function IdleLogout() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const logoutInProgressRef = useRef(false);
  const idleTimeoutRef = useRef<number | null>(null);
  const lastSyncedActivityRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }

      logoutInProgressRef.current = false;
      return;
    }

    const idleTimeoutMs = getIdleTimeoutMs();

    const redirectToLogin = () => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const loginUrl =
        currentPath && currentPath !== '/login'
          ? `/login?returnurl=${encodeURIComponent(currentPath)}`
          : '/login';

      router.replace(loginUrl);
    };

    const performIdleLogout = async () => {
      if (logoutInProgressRef.current) return;
      logoutInProgressRef.current = true;

      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // Clear the local session even when the logout request cannot complete.
      }

      dispatch(clearAuthState());
      localStorage.removeItem(IDLE_ACTIVITY_STORAGE_KEY);
      await clearPersistedSession();
      redirectToLogin();
    };

    const scheduleLogoutCheck = (activityTimestamp: number) => {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }

      const elapsedMs = Date.now() - activityTimestamp;
      const remainingMs = Math.max(idleTimeoutMs - elapsedMs, 0);

      idleTimeoutRef.current = window.setTimeout(() => {
        void performIdleLogout();
      }, remainingMs);
    };

    const syncActivityTimestamp = (force = false) => {
      const now = Date.now();
      if (
        !force &&
        now - lastSyncedActivityRef.current < ACTIVITY_SYNC_INTERVAL_MS
      ) {
        scheduleLogoutCheck(lastSyncedActivityRef.current || now);
        return;
      }

      lastSyncedActivityRef.current = now;
      localStorage.setItem(IDLE_ACTIVITY_STORAGE_KEY, String(now));
      scheduleLogoutCheck(now);
    };

    const readStoredActivity = () => {
      const storedValue = localStorage.getItem(IDLE_ACTIVITY_STORAGE_KEY);
      const parsedValue = Number(storedValue);

      if (Number.isFinite(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }

      return null;
    };

    const initialActivity = readStoredActivity();

    if (initialActivity && Date.now() - initialActivity >= idleTimeoutMs) {
      void performIdleLogout();
      return;
    }

    if (initialActivity) {
      lastSyncedActivityRef.current = initialActivity;
      scheduleLogoutCheck(initialActivity);
    } else {
      syncActivityTimestamp(true);
    }

    const handleActivity = () => {
      syncActivityTimestamp();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const storedActivity = readStoredActivity();

      if (storedActivity && Date.now() - storedActivity >= idleTimeoutMs) {
        void performIdleLogout();
        return;
      }

      if (storedActivity) {
        lastSyncedActivityRef.current = storedActivity;
        scheduleLogoutCheck(storedActivity);
        return;
      }

      handleActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== IDLE_ACTIVITY_STORAGE_KEY) return;

      if (!event.newValue) {
        void performIdleLogout();
        return;
      }

      const nextActivity = Number(event.newValue);
      if (!Number.isFinite(nextActivity) || nextActivity <= 0) return;

      lastSyncedActivityRef.current = nextActivity;
      scheduleLogoutCheck(nextActivity);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'focus',
      'touchstart',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);

      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    };
  }, [dispatch, isAuthenticated, router]);

  return null;
}
