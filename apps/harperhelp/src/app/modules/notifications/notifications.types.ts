
import { EmailNotificationEntityType } from '@harperhelp/types';
export enum EmailEventType {
  // PROJECT_CREATED = 'project.created',
  PROJECT_ASSIGNED = 'project.assigned',
  PROJECT_UNASSIGNED = 'project.unassigned',
  THREAD_MESSAGE_CREATED = 'thread.message_created',
  TICKET_CREATED = 'ticket.created',
  TICKET_INTERNAL_MESSAGE = 'ticket.internal_message',
  TICKET_REPLY_POSTED = 'ticket.reply_posted',
  TICKET_STATUS_UPDATED = 'ticket.status_updated',
  TICKET_PRIORITY_UPDATED = 'ticket.priority_updated',
  TICKET_ASSIGNEE_UPDATED = 'ticket.assignee_updated',
  // TICKET_ATTACHMENT_ADDED = 'ticket.attachment_added',
  THREAD_REPLY_CREATED = 'thread.reply_created'

}


export function getEmailNotificationEntityType(
  eventType: EmailEventType,
): EmailNotificationEntityType {
  return EMAIL_NOTIFICATION_METADATA[eventType].entityType;
}

export const EMAIL_NOTIFICATION_METADATA : Record<EmailEventType, { entityType: EmailNotificationEntityType; label: string }> = {
  // [EmailEventType.PROJECT_CREATED]: {
  //   entityType: EmailNotificationEntityType.PROJECT,
  //   label: 'Project created',
  // },

  [EmailEventType.PROJECT_ASSIGNED]: {
    entityType: EmailNotificationEntityType.PROJECT,
    label: 'Project assigned',
  },

  [EmailEventType.PROJECT_UNASSIGNED]: {
    entityType: EmailNotificationEntityType.PROJECT,
    label: 'Project unassigned',
  },

  [EmailEventType.THREAD_MESSAGE_CREATED]: {
    entityType: EmailNotificationEntityType.THREAD,
    label: 'New thread',
  },

  [EmailEventType.THREAD_REPLY_CREATED]: {
    entityType: EmailNotificationEntityType.THREAD,
    label: 'Thread reply',
  },

  [EmailEventType.TICKET_CREATED]: {
    entityType: EmailNotificationEntityType.TICKET,
    label: 'Ticket created',
  },

  [EmailEventType.TICKET_REPLY_POSTED]: {
    entityType: EmailNotificationEntityType.TICKET,
    label: 'Ticket reply',
  },

  [EmailEventType.TICKET_INTERNAL_MESSAGE]: {
    entityType: EmailNotificationEntityType.TICKET,
    label: 'Internal message',
  },

  [EmailEventType.TICKET_STATUS_UPDATED]: {
    entityType: EmailNotificationEntityType.TICKET,
    label: 'Status updated',
  },

  [EmailEventType.TICKET_PRIORITY_UPDATED]: {
    entityType: EmailNotificationEntityType.TICKET,
    label: 'Priority updated',
  },

  [EmailEventType.TICKET_ASSIGNEE_UPDATED]: {
    entityType: EmailNotificationEntityType.TICKET,
    label: 'Assignee updated',
  },

  // [EmailEventType.TICKET_ATTACHMENT_ADDED]: {
  //   entityType: EmailNotificationEntityType.TICKET,
  //   label: 'Ticket attachment added',
  // },
} as const;

// export interface EmailAttachmentLink {
//   filename: string;
//   extension: string;   // lowercase, no dot — e.g. "pdf", "png"
//   viewUrl: string;      // opens/previews in browser
//   downloadUrl: string;  // forces Save-As
//   sizeLabel: string;    // '' if unknown — renderer skips the size line
// }

export interface EmailRecipient {
  userId: string;
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
  // attachments?: EmailAttachmentLink[];
}

export interface ProjectAssignedPayload {
  projectName: string;
  projectId: string;
  assignedTo: EmailRecipient;
  assignedBy: EmailRecipient;
}

// export interface ProjectAssignedPayload
//   extends Omit<
//     ProjectCreatedPayload,
//     'projectId' | 'projectCode' | 'description'
//   > {}

export interface ProjectUnassignedPayload {
  projectName: string;
  unassignedFrom: EmailRecipient;
  unassignedBy: EmailRecipient;
}

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
  // attachments?: EmailAttachmentLink[];
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
  // attachments?: EmailAttachmentLink[]; // optional list of attachments to show in the email
}

export interface TicketInternalMessageEmailPayload {
  projectId: string
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  projectName: string;
  replyContent: string;
  isInternal: boolean; // internal PM<->Dev vs external PM<->Client
  postedBy: EmailRecipient;
  participants: EmailRecipient[];
  // attachments?: EmailAttachmentLink[]; // optional list of attachments to show in the email
}

export interface TicketStatusUpdatedPayload {
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  projectName: string;
  projectId: string;
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
  projectId: string;
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
  projectId: string;
  previousAssignee?: EmailRecipient;
  newAssignee: EmailRecipient;
  updatedBy: EmailRecipient;
  participants: EmailRecipient[];
}

// export interface TicketAttachmentAddedPayload {
//   ticketId: string;
//   ticketNumber: string;
//   ticketTitle: string;
//   projectName: string;
//   fileName: string;
//   fileSize: string; // human-readable e.g. "2.4 MB"
//   uploadedBy: EmailRecipient;
//   participants: EmailRecipient[];
//   // attachments?: EmailAttachmentLink[];
// }

export interface ThreadMessageCreatedPayload {
  messageId: string;
  projectId: string;
  projectName: string;
  message: string;
  createdBy: EmailRecipient;
  participants: EmailRecipient[];
  // attachments?: EmailAttachmentLink[];
}
export interface ThreadReplyCreatedPayload {
  messageId: string;
  projectId: string;
  projectName: string;
  message: string;
  createdBy: EmailRecipient;
  participants: EmailRecipient[];
  parentMessage: {
    id: string;
    message: string;
  };
  // attachments?: EmailAttachmentLink[];
}

// Union event type used internally

export function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type EmailNotificationEvent =
  // | { type: EmailEventType.PROJECT_CREATED; payload: ProjectCreatedPayload }
  | { type: EmailEventType.PROJECT_UNASSIGNED; payload: ProjectUnassignedPayload }
  | { type: EmailEventType.PROJECT_ASSIGNED; payload: ProjectAssignedPayload } 
  | {type: EmailEventType.THREAD_MESSAGE_CREATED; payload: ThreadMessageCreatedPayload }
  | { type: EmailEventType.THREAD_REPLY_CREATED; payload: ThreadReplyCreatedPayload }
  | { type: EmailEventType.TICKET_CREATED; payload: TicketCreatedPayload }
  | {
      type: EmailEventType.TICKET_REPLY_POSTED;
      payload: TicketReplyPostedPayload;
    }
  | {
      type: EmailEventType.TICKET_INTERNAL_MESSAGE;
      payload: TicketInternalMessageEmailPayload;
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
    };
  // | {
  //     type: EmailEventType.TICKET_ATTACHMENT_ADDED;
  //     payload: TicketAttachmentAddedPayload;
  //   };
