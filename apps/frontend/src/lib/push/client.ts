const SW_PATH = '/sw.js';

export type PushEnableResult =
  | 'enabled'
  | 'denied'
  | 'unsupported'
  | 'unavailable'
  | 'error';

export type PushSetupResult =
  | { ok: true }
  | { ok: false; step: string; error: string };

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Thrown by fetchVapidPublicKey when the session itself is the problem. */
class PushAuthError extends Error {
  constructor() {
    super('AUTH');
    this.name = 'AUTH';
  }
}

/** Null when the server has no VAPID keys configured (push disabled). */
export async function fetchVapidPublicKey(): Promise<string | null> {
  const res = await fetch('/api/push/public-key', {
    cache: 'no-store',
    credentials: 'include',
  });

  // The session ended between mount and this call (e.g. idle logout) --
  // distinct from push genuinely being unconfigured on the server.
  if (res.status === 401) throw new PushAuthError();
  if (!res.ok) return null;

  const data = (await res.json()) as { publicKey?: string | null };
  return data.publicKey ?? null;
}

/**
 * The account-level switch (set via /push/subscribe, or the Settings toggle).
 * null means the user has never decided on any device -- distinct from an
 * explicit "off" -- so a brand-new device still shows the normal opt-in ask.
 */
export async function fetchPushPreference(): Promise<boolean | null> {
  try {
    const res = await fetch('/api/push/preference', {
      cache: 'no-store',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { enabled?: boolean | null };
    return data.enabled ?? null;
  } catch {
    return null;
  }
}

async function registerServiceWorker() {
  await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  return navigator.serviceWorker.ready;
}

async function ensureSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string,
) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const options = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  };

  try {
    return await registration.pushManager.subscribe(options);
  } catch (err) {
    // A subscription made with a different key blocks a new one.
    if (err instanceof DOMException && err.name === 'InvalidStateError') {
      const stale = await registration.pushManager.getSubscription();
      await stale?.unsubscribe();
      return registration.pushManager.subscribe(options);
    }
    throw err;
  }
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      userAgent: navigator.userAgent.slice(0, 500),
    }),
  });
  if (!res.ok) throw new Error(`Save failed with HTTP ${res.status}.`);
}

/** Runs the full registration once permission is granted. */
async function subscribeAndSave(): Promise<PushSetupResult> {
  let step = 'public-key';

  try {
    const publicKey = await fetchVapidPublicKey();
    if (!publicKey) {
      return {
        ok: false,
        step,
        error: 'No VAPID public key from the server (push disabled, or the request failed).',
      };
    }

    step = 'service-worker';
    const registration = await registerServiceWorker();

    step = 'subscribe';
    const subscription = await ensureSubscription(registration, publicKey);

    step = 'save';
    await saveSubscription(subscription);
    return { ok: true };
  } catch (err) {
    if (err instanceof PushAuthError) {
      return { ok: false, step, error: 'AUTH' };
    }
    return {
      ok: false,
      step,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

/** Must be called from a user gesture (required by iOS). */
export async function enablePush(): Promise<{
  result: PushEnableResult;
  detail?: string;
}> {
  if (!isPushSupported()) return { result: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { result: 'denied' };

  const setup = await subscribeAndSave();
  if (setup.ok) return { result: 'enabled' };

  console.warn('[push] enable failed', setup);
  return {
    result: setup.step === 'public-key' ? 'unavailable' : 'error',
    detail: `${setup.step}: ${setup.error}`,
  };
}

/**
 * Re-registers the device for the signed-in user. Safe to run on every load
 * once permission is granted: it refreshes the row and heals dropped
 * subscriptions (iOS does this) without prompting.
 */
export async function syncPushSubscription(): Promise<PushSetupResult> {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    return { ok: true };
  }

  const setup = await subscribeAndSave();
  if (!setup.ok) console.warn('[push] sync failed', setup);
  return setup;
}

/** Removes this device's subscription so the next user on it is not notified. */
export async function disablePushForThisDevice(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined);

    await subscription.unsubscribe();
    await clearAppBadge();
  } catch {
    // Logout must never fail because of push cleanup.
  }
}

/**
 * The Settings-page "turn off" action: tells the server to drop every
 * device's subscription, then best-effort cleans up this device's own
 * browser-level subscription so it doesn't linger as an orphan.
 */
export async function disablePushEverywhere(): Promise<void> {
  const res = await fetch('/api/push/preference/disable', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Disable failed with HTTP ${res.status}.`);

  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
    await clearAppBadge();
  } catch {
    // The server-side row is already gone, which is what actually stops
    // delivery; local cleanup here is a tidiness best-effort.
  }
}

export async function updateAppBadge(count: number): Promise<void> {
  const nav = navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };

  try {
    if (count > 0) await nav.setAppBadge?.(count);
    else await nav.clearAppBadge?.();
  } catch {
    // Badging is best-effort.
  }
}

export function clearAppBadge() {
  return updateAppBadge(0);
}
