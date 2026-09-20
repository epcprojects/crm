import type { AddContactFormValues } from '../components/modals/AddContactModal';

export type CreatedContact = {
  id: string;
  fullName: string | null;
  phone: string;
};

export type LookedUpContact = CreatedContact & {
  email: string | null;
  source: string | null;
  notes: string | null;
};

const CONTACT_PHONE_PATTERN = /^[0-9+\-\s()]{6,30}$/;

// Mirrors the backend's phone normalization so lookups match how phones are stored.
export function normalizeContactPhone(phone: string) {
  return phone.replace(/[\s\-()]/g, '').trim();
}

export function isValidContactPhone(phone: string) {
  return CONTACT_PHONE_PATTERN.test(phone.trim());
}

export async function findContactByPhone(
  phone: string,
): Promise<LookedUpContact | null> {
  const normalizedPhone = normalizeContactPhone(phone);
  const params = new URLSearchParams({ search: normalizedPhone, limit: '20' });

  const response = await fetch(`/api/contacts?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as {
    items?: LookedUpContact[];
    message?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(payload?.message || 'Failed to look up contact.');
  }

  return (
    payload.items.find(
      (contact) => normalizeContactPhone(contact.phone) === normalizedPhone,
    ) ?? null
  );
}

export function toContactPayload(values: AddContactFormValues) {
  return {
    fullName: values.fullName?.trim() || undefined,
    phone: values.phone.trim(),
    email: values.email?.trim() || undefined,
    source: values.source?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  };
}

export async function updateContact(
  contactId: string,
  values: AddContactFormValues,
): Promise<void> {
  const response = await fetch(`/api/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(toContactPayload(values)),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message;

    throw new Error(message || 'Failed to update contact.');
  }
}

export async function createContact(
  values: AddContactFormValues,
): Promise<CreatedContact> {
  const response = await fetch('/api/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(toContactPayload(values)),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message;

    throw new Error(message || 'Failed to create contact.');
  }

  return payload;
}
