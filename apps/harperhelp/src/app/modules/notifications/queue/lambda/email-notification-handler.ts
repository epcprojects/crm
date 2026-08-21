import sgMail from '@sendgrid/mail';
import {
  buildAttachmentAddedEmail,
  buildAssigneeUpdatedEmail,
  buildPriorityUpdatedEmail,
  buildProjectCreatedEmail,
  buildStatusUpdatedEmail,
  buildTicketCreatedEmail,
  buildTicketReplyEmail,
  buildThreadMessageCreatedEmail,
  buildThreadReplyCreatedEmail,
  buildProjectUnassignedEmail,
  buildProjectAssignedEmail,
} from '../../templates/common';
import {
  EmailEventType,
  EmailNotificationEvent,
} from '../../notifications.types';

interface SQSRecord {
  body: string;
  messageId: string;
}

interface SQSEvent {
  Records?: SQSRecord[];
}

interface SQSBatchResponse {
  batchItemFailures: Array<{ itemIdentifier: string }>;
}

const appUrl = process.env.FRONTEND_APP_URL || 'http://localhost:4200';
const appName = process.env.APP_NAME || 'HarperHelpDesk';
const fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
const fromName = 'HarperHelp';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendMailToRecipients(
  recipients: Array<{ email: string; name: string }>,
  subject: string,
  html: string,
) {
  if (!process.env.SENDGRID_API_KEY || !fromEmail) {
    throw new Error('SendGrid environment variables are not configured');
  }

  if (!recipients.length) return;

  const personalizations = recipients.map((recipient) => ({
    to: [{ email: recipient.email, name: recipient.name }],
  }));

  await sgMail.send({
    from: { email: fromEmail, name: fromName },
    subject,
    html,
    personalizations,
  });
}

function buildEmailForEvent(event: EmailNotificationEvent) {
  switch (event.type) {
    case EmailEventType.PROJECT_CREATED:
      return buildProjectCreatedEmail(event.payload, appUrl);
    case EmailEventType.PROJECT_ASSIGNED:
      return buildProjectAssignedEmail(event.payload, appUrl);
    case EmailEventType.PROJECT_UNASSIGNED:
      return buildProjectUnassignedEmail(event.payload, appUrl);
    case EmailEventType.THREAD_MESSAGE_CREATED:
      return buildThreadMessageCreatedEmail(event.payload, appUrl);
    case EmailEventType.THREAD_REPLY_CREATED:
      return buildThreadReplyCreatedEmail(event.payload, appUrl);
    case EmailEventType.TICKET_CREATED:
      return buildTicketCreatedEmail(event.payload, appUrl);
    case EmailEventType.TICKET_REPLY_POSTED:
      return buildTicketReplyEmail(event.payload, appUrl);
    case EmailEventType.TICKET_STATUS_UPDATED:
      return buildStatusUpdatedEmail(event.payload, appUrl);
    case EmailEventType.TICKET_PRIORITY_UPDATED:
      return buildPriorityUpdatedEmail(event.payload, appUrl);
    case EmailEventType.TICKET_ASSIGNEE_UPDATED:
      return buildAssigneeUpdatedEmail(event.payload, appUrl);
    case EmailEventType.TICKET_ATTACHMENT_ADDED:
      return buildAttachmentAddedEmail(event.payload, appUrl);
  }
}

function filterAcceptedRecipients(
  recipients: Array<{
    email: string;
    name: string;
    isInvitationAccepted?: boolean;
  }>,
) {
  return recipients.filter(
    (recipient) => recipient.isInvitationAccepted === true,
  );
}

function resolveRecipients(event: EmailNotificationEvent) {
  switch (event.type) {
    case EmailEventType.PROJECT_CREATED:
      return event.payload.members;
    case EmailEventType.PROJECT_ASSIGNED:
      return event.payload.assignedTo ? [event.payload.assignedTo] : [];
    case EmailEventType.PROJECT_UNASSIGNED:
      return event.payload.unassignedFrom ? [event.payload.unassignedFrom] : [];
    case EmailEventType.TICKET_CREATED:
      return event.payload.participants;
    case EmailEventType.THREAD_MESSAGE_CREATED:
      return event.payload.participants;
    case EmailEventType.THREAD_REPLY_CREATED:
      return event.payload.participants;
    case EmailEventType.TICKET_REPLY_POSTED:
      return event.payload.participants.filter(
        (recipient) => recipient.email !== event.payload.postedBy.email,
      );
    case EmailEventType.TICKET_STATUS_UPDATED:
      return event.payload.participants.filter(
        (recipient) => recipient.email !== event.payload.updatedBy.email,
      );
    case EmailEventType.TICKET_PRIORITY_UPDATED:
      return event.payload.participants.filter(
        (recipient) => recipient.email !== event.payload.updatedBy.email,
      );
    case EmailEventType.TICKET_ASSIGNEE_UPDATED:
      return [
        ...new Map(
          [...event.payload.participants, event.payload.newAssignee].map(
            (recipient) => [recipient.email, recipient],
          ),
        ).values(),
      ].filter(
        (recipient) => recipient.email !== event.payload.updatedBy.email,
      );
    case EmailEventType.TICKET_ATTACHMENT_ADDED:
      return event.payload.participants.filter(
        (recipient) => recipient.email !== event.payload.uploadedBy.email,
      );
  }

  return [];
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];

  console.log('event records:', event);

  for (const record of event.Records ?? []) {
    try {
      const parsed = JSON.parse(record.body) as EmailNotificationEvent;
      console.log('parsed:', parsed);
      const { subject, html } = buildEmailForEvent(parsed);
      console.log('HTML:', html, 'Subject:', subject);
      const resolvedRecipients = resolveRecipients(parsed);
      console.log('Recipients:', resolvedRecipients);
      const recipients = filterAcceptedRecipients(resolvedRecipients);
      console.log('Filtered Recipients:', recipients);
      await sendMailToRecipients(recipients, subject, html);
    } catch (error) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
