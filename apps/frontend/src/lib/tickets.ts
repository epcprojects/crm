import { uploadFilesDirectly } from './attachments';

export type CreateTicketPayload = {
  projectId: string;
  title: string;
  description?: string;
  statusKey: string;
  priorityKey?: string;
  assigneeId?: string;
  dueDate?: string;
  attachments?: File[];
};

export async function createTicket(payload: CreateTicketPayload) {
  const validAttachments = (payload.attachments ?? []).filter(
    (attachment) => attachment.size > 0,
  );

  const uploadedAttachments = validAttachments.length
    ? await uploadFilesDirectly(validAttachments, `projects/${payload.projectId}/tickets/creation`)
    : [];

  const body: Record<string, unknown> = {
    title: payload.title,
    statusKey: payload.statusKey,
  };

  if (payload.description?.trim()) {
    body.description = payload.description.trim();
  }

  if (payload.priorityKey?.trim()) {
    body.priorityKey = payload.priorityKey.trim();
  }

  if (payload.assigneeId?.trim()) {
    body.assigneeId = payload.assigneeId.trim();
  }

  if (payload.dueDate?.trim()) {
    body.dueDate = payload.dueDate.trim();
  }

  if (uploadedAttachments.length) {
    body.attachments = uploadedAttachments;
  }

  const response = await fetch(`/api/projects/${payload.projectId}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      Array.isArray(data?.message) && data.message.length
        ? data.message.join(', ')
        : data?.message || 'Failed to create ticket.';

    throw new Error(message);
  }

  return data;
}
