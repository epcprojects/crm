'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@headlessui/react';
import { appToast } from '../toast/AppToast';
import {
  disablePushEverywhere,
  enablePush,
  fetchPushPreference,
  isIosDevice,
  isPushSupported,
  isStandalonePwa,
  type PushEnableResult,
} from '../../lib/push/client';

const QUERY_KEY = ['settings', 'push-preference'];

class PushToggleError extends Error {
  constructor(
    public readonly result: PushEnableResult,
    public readonly detail?: string,
  ) {
    super(detail ?? result);
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof PushToggleError)) {
    return 'Could not update push notifications. Please try again.';
  }

  switch (error.result) {
    case 'unsupported':
      return 'Push notifications are not supported in this browser.';
    case 'denied':
      return 'Notifications are blocked for this site. Allow them in your browser settings, then try again.';
    default:
      return process.env.NODE_ENV !== 'production' && error.detail
        ? `Could not enable push (${error.detail})`
        : 'Could not enable push notifications. Please try again.';
  }
}

/**
 * The account-level on/off switch, mirroring the Email Notification
 * Settings card next to it. Lets a user who dismissed (or never saw) the
 * opt-in banner turn push on later, and turns it off everywhere at once --
 * every device this account is subscribed on, not just the one in front of
 * the user.
 */
export default function PushNotificationSettingsCard() {
  const queryClient = useQueryClient();

  const preferenceQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPushPreference,
  });

  const toggleMutation = useMutation({
    mutationFn: async (nextEnabled: boolean) => {
      if (!nextEnabled) {
        await disablePushEverywhere();
        return false;
      }

      const { result, detail } = await enablePush();
      if (result !== 'enabled') throw new PushToggleError(result, detail);
      return true;
    },
    onSuccess: (enabled) => {
      queryClient.setQueryData(QUERY_KEY, enabled);
      appToast.success(
        enabled
          ? 'Push notifications are on for this device.'
          : 'Push notifications are off for every device on this account.',
      );
    },
    onError: (error) => appToast.error(describeError(error)),
  });

  const enabled = preferenceQuery.data === true;
  const supported = isPushSupported();
  const needsIosInstall = !supported && isIosDevice() && !isStandalonePwa();

  return (
    <section className="flex h-auto min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-2.5 xl:p-5">
      <h2 className="text-base font-medium text-gray-900 xl:text-lg">
        Push Notification Settings
      </h2>

      <div className="mt-3 md:mt-6 rounded-xl overflow-hidden border border-gray-200 bg-gray-50/60">
        <div className="flex items-start justify-between gap-3 bg-white p-3 md:p-4">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Push notifications
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Get a system notification for new leads, replies, mentions and
              assignments -- even when the app is closed. Turning this on or
              off applies to every device you sign in on.
            </p>
            {needsIosInstall && (
              <p className="mt-1 text-xs text-amber-600">
                On iPhone, add this app to your Home Screen first (Share,
                then &quot;Add to Home Screen&quot;).
              </p>
            )}
          </div>
          <Switch
            checked={enabled}
            onChange={(next) => toggleMutation.mutate(next)}
            disabled={preferenceQuery.isLoading || toggleMutation.isPending}
            className={`${enabled ? 'bg-primary border-primary' : 'bg-gray-100 border-gray-200'}
              relative inline-flex h-5 w-10 shrink-0 rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <span className="sr-only">Push notifications</span>
            <span
              aria-hidden="true"
              className={`${enabled ? 'translate-x-5' : 'translate-x-0'}
                pointer-events-none inline-block h-4.5 border border-gray-200 w-4.5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
            />
          </Switch>
        </div>
      </div>
    </section>
  );
}
