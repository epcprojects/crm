export type CreateTicketPayload = {
  projectId: string;
  title: string;
  description?: string;
  statusKey: string;
  assigneeId?: string;
  dueDate?: string;
  attachments?: File[];
};

export async function createTicket(payload: CreateTicketPayload) {
  const formData = new FormData();

  formData.append('title', payload.title);
  formData.append('statusKey', payload.statusKey);

  if (payload.description?.trim()) {
    formData.append('description', payload.description.trim());
  }

  if (payload.assigneeId?.trim()) {
    formData.append('assigneeId', payload.assigneeId.trim());
  }

  if (payload.dueDate?.trim()) {
    formData.append('dueDate', payload.dueDate.trim());
  }

  payload.attachments?.forEach((attachment) => {
    if (attachment.size > 0) {
      formData.append('attachments', attachment, attachment.name);
    }
  });

  const response = await fetch(`/api/projects/${payload.projectId}/tickets`, {
    method: 'POST',
    body: formData,
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
