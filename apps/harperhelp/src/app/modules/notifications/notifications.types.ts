export enum EmailEventType {
  PROJECT_CREATED = 'project.created',
  PROJECT_ASSIGNED = 'project.assigned',
  THREAD_MESSAGE_CREATED = 'thread.message_created',
  TICKET_CREATED = 'ticket.created',
  TICKET_REPLY_POSTED = 'ticket.reply_posted',
  TICKET_STATUS_UPDATED = 'ticket.status_updated',
  TICKET_PRIORITY_UPDATED = 'ticket.priority_updated',
  TICKET_ASSIGNEE_UPDATED = 'ticket.assignee_updated',
  TICKET_ATTACHMENT_ADDED = 'ticket.attachment_added',
}

export interface EmailRecipient {
  email: string;
  name: string;
  isInvitationAccepted?: boolean; // optional property to indicate if the invite is accepted
}

// Payload shapes per event

export interface ProjectCreatedPayload {
  projectId: string;
  projectName: string;
  projectCode: string;
  description?: string;
  createdBy: EmailRecipient;
  members: EmailRecipient[];
}

export interface ProjectAssignedPayload
  extends Omit<
    ProjectCreatedPayload,
    'projectId' | 'projectCode' | 'description'
  > {}

export interface TicketCreatedPayload {
  ticketId: string;
  ticketNumber: string; // e.g. PROJ-20240101-0000001
  title: string;
  description: string;
  priority: string;
  status: string;
  projectId: string;
  projectName: string;
  createdBy: EmailRecipient;
  assignee?: EmailRecipient;
  participants: EmailRecipient[];
}

export interface TicketReplyPostedPayload {
  projectId: string
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  projectName: string;
  replyContent: string;
  isInternal: boolean; // internal PM<->Dev vs external PM<->Client
  postedBy: EmailRecipient;
  participants: EmailRecipient[];
}

export interface TicketStatusUpdatedPayload {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  projectName: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: EmailRecipient;
  participants: EmailRecipient[];
}

export interface TicketPriorityUpdatedPayload {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  projectName: string;
  previousPriority: string;
  newPriority: string;
  updatedBy: EmailRecipient;
  participants: EmailRecipient[];
}

export interface TicketAssigneeUpdatedPayload {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  projectName: string;
  previousAssignee?: EmailRecipient;
  newAssignee: EmailRecipient;
  updatedBy: EmailRecipient;
  participants: EmailRecipient[];
}

export interface TicketAttachmentAddedPayload {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  projectName: string;
  fileName: string;
  fileSize: string; // human-readable e.g. "2.4 MB"
  uploadedBy: EmailRecipient;
  participants: EmailRecipient[];
}

export interface ThreadMessageCreatedPayload {
  messageId: string;
  projectId: string;
  createdBy: EmailRecipient;
  participants: EmailRecipient[];
}

// Union event type used internally

export type EmailNotificationEvent =
  | { type: EmailEventType.PROJECT_CREATED; payload: ProjectCreatedPayload }
  | { type: EmailEventType.PROJECT_ASSIGNED; payload: ProjectAssignedPayload } 
  | {type: EmailEventType.THREAD_MESSAGE_CREATED; payload: ThreadMessageCreatedPayload }
  | { type: EmailEventType.TICKET_CREATED; payload: TicketCreatedPayload }
  | {
      type: EmailEventType.TICKET_REPLY_POSTED;
      payload: TicketReplyPostedPayload;
    }
  | {
      type: EmailEventType.TICKET_STATUS_UPDATED;
      payload: TicketStatusUpdatedPayload;
    }
  | {
      type: EmailEventType.TICKET_PRIORITY_UPDATED;
      payload: TicketPriorityUpdatedPayload;
    }
  | {
      type: EmailEventType.TICKET_ASSIGNEE_UPDATED;
      payload: TicketAssigneeUpdatedPayload;
    }
  | {
      type: EmailEventType.TICKET_ATTACHMENT_ADDED;
      payload: TicketAttachmentAddedPayload;
    };
