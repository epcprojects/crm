import type { AddContactFormValues } from '../components/modals/AddContactModal';

export type CreatedContact = {
  id: string;
  fullName: string | null;
  phone: string;
};

export function toContactPayload(values: AddContactFormValues) {
  return {
    fullName: values.fullName?.trim() || undefined,
    phone: values.phone.trim(),
    email: values.email?.trim() || undefined,
    source: values.source?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  };
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
