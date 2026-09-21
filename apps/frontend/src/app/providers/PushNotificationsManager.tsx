'use client';

import { useEffect, useState } from 'react';

import { useAppSelector } from '../Redux/store';
import { useNotificationsSocket } from './NotificationsSocketProvider';
import { appToast } from '../../components/toast/AppToast';
import {
  enablePush,
  fetchVapidPublicKey,
  isIosDevice,
  isPushSupported,
  isStandalonePwa,
  syncPushSubscription,
  updateAppBadge,
} from '../../lib/push/client';

const DISMISSED_KEY = 'push-prompt-dismissed-at';
const DISMISS_DAYS = 7;

type PromptMode = 'enable' | 'install-ios' | null;

function wasRecentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable (private mode); the banner just reappears.
  }
}

/**
 * Keeps this device registered for push once permission is granted, mirrors
 * the unread count onto the app icon badge, and shows a one-time opt-in prompt.
 */
export function PushNotificationsManager() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { unreadCount } = useNotificationsSocket();
  const [mode, setMode] = useState<PromptMode>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setMode(null);
      return;
    }

    let cancelled = false;

    async function init() {
      if (!isPushSupported()) {
        // iOS only exposes push to installed Home Screen apps.
        if (isIosDevice() && !isStandalonePwa() && !wasRecentlyDismissed()) {
          setMode('install-ios');
        }
        return;
      }

      if (Notification.permission === 'granted') {
        const setup = await syncPushSubscription();
        // Dev only: make silent registration failures visible on a phone.
        if (!setup.ok && process.env.NODE_ENV !== 'production') {
          appToast.error(`Push setup failed at "${setup.step}": ${setup.error}`, {
            autoClose: false,
            toastId: 'push-setup-error',
          });
        }
        return;
      }

      if (Notification.permission === 'denied' || wasRecentlyDismissed()) {
        return;
      }

      // Only offer the prompt when the server actually has push configured.
      const publicKey = await fetchVapidPublicKey();
      if (!cancelled && publicKey) setMode('enable');
    }

    void init();

    return () => {
      cancelled = true;
    };
    // Re-run when the signed-in user changes so a shared device re-binds.
  }, [isAuthenticated, userId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void updateAppBadge(unreadCount);
  }, [isAuthenticated, unreadCount]);

  if (!mode) return null;

  const dismiss = () => {
    rememberDismissal();
    setMode(null);
  };

  const handleEnable = async () => {
    setBusy(true);
    const { result, detail } = await enablePush();
    setBusy(false);
    setMode(null);

    if (result === 'enabled') {
      appToast.success('Push notifications are on for this device.');
    } else if (result === 'denied') {
      rememberDismissal();
      appToast.warning(
        'Notifications are blocked. Allow them in your browser settings to enable push.',
      );
    } else {
      appToast.error(
        process.env.NODE_ENV !== 'production' && detail
          ? `Could not enable push (${detail})`
          : 'Could not enable push notifications. Please try again.',
        { autoClose: process.env.NODE_ENV !== 'production' ? false : undefined },
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Push notifications"
      className="fixed inset-x-4 bottom-4 z-[1000] rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_8px_30px_rgb(0_0_0/0.12)] sm:left-auto sm:right-5 sm:w-[360px]"
    >
      <p className="text-sm font-semibold text-gray-900">
        {mode === 'enable'
          ? 'Get notified even when the app is closed'
          : 'Install the app to get notifications'}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {mode === 'enable'
          ? 'Turn on push notifications to hear about new leads, replies and assignments right away.'
          : 'On iPhone, tap Share, then "Add to Home Screen", and open the app from there to turn on notifications.'}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          {mode === 'enable' ? 'Not now' : 'Dismiss'}
        </button>
        {mode === 'enable' && (
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {busy ? 'Enabling…' : 'Enable'}
          </button>
        )}
      </div>
    </div>
  );
}
