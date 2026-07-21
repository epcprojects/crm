import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { adminInviteTemplate } from './templates/invite.email.template';
import { forgotPasswordTemplate } from './templates/forgot-password.email.template';

import {
  EmailEventType,
  EmailNotificationEvent,
  EmailRecipient,
  ProjectCreatedPayload,
  TicketCreatedPayload,
  TicketReplyPostedPayload,
  TicketStatusUpdatedPayload,
  TicketPriorityUpdatedPayload,
  TicketAssigneeUpdatedPayload,
  TicketAttachmentAddedPayload,
  ProjectAssignedPayload,
  ThreadMessageCreatedPayload,
} from './notifications.types';
import {
  buildProjectCreatedEmail,
  buildTicketCreatedEmail,
  buildTicketReplyEmail,
  buildStatusUpdatedEmail,
  buildPriorityUpdatedEmail,
  buildAssigneeUpdatedEmail,
  buildAttachmentAddedEmail,
  buildProjectAssignedEmail,
  buildThreadMessageCreatedEmail,
} from './templates/common';
import { SqsNotificationQueueService } from './queue/sqs-notification-queue.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly appUrl: string;
  private readonly appName: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly queueUrl?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: SqsNotificationQueueService,
  ) {
    sgMail.setApiKey(this.configService.get<string>('sendgrid.apiKey'));

    this.appUrl = this.configService.get<string>('app.hostUrl');
    this.fromEmail = this.configService.get<string>('sendgrid.fromEmail');
    this.fromName = 'HarperHelp';
    this.appName = 'HarperHelpDesk';
    this.queueUrl = this.configService.get<string>(
      'aws.sqs.notificationQueueUrl',
    );
  }

  private async sendEmail(msg: sgMail.MailDataRequired) {
    try {
      this.logger.log('Email data ===>', msg);
      await sgMail.send(msg);

      this.logger.log(`Email sent to ${msg.to}`);
    } catch (error) {
      const errorMessage =
        error.response?.body?.errors?.[0]?.message || error.message;

      this.logger.error(`Failed sending email to ${msg.to}: ${errorMessage}`);
    }
  }

  async sendAdminInviteEmail(params: {
    to: string;
    fullName: string;
    role: string;
    projectName: string;
    inviteToken: string;
  }) {
    const { to, fullName, role, projectName, inviteToken } = params;

    const inviteLink = `${this.appUrl}/auth/accept-invite?token=${inviteToken}`;

    const html = adminInviteTemplate({
      fullName,
      role,
      projectName,
      inviteLink,
      appUrl: this.appUrl,
    });

    const msg: sgMail.MailDataRequired = {
      to,

      from: {
        email: this.fromEmail,
        name: this.fromName,
      },

      subject: `You're invited to join '${projectName}'`,

      html,
    };

    return this.sendEmail(msg);
  }

  async sendForgotPasswordEmail(params: {
    to: string;
    fullName: string;
    resetToken: string;
  }) {
    const { to, fullName, resetToken } = params;

    const resetLink = `${this.appUrl}/auth/set-password?token=${resetToken}`;

    const html = forgotPasswordTemplate({
      fullName,
      resetLink,
    });

    const msg: sgMail.MailDataRequired = {
      to,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: 'Reset your password',
      html,
    };

    return this.sendEmail(msg);
  }

  // Public dispatch method (use this everywhere in the app)

  async dispatch(event: EmailNotificationEvent): Promise<void> {
    if (this.queueUrl) {
      await this.queueService.publish(event);
      return;
    }

    switch (event.type) {
      case EmailEventType.PROJECT_CREATED:
        return this.onProjectCreated(event.payload);
      case EmailEventType.PROJECT_ASSIGNED:
        return this.onProjectAssigned(event.payload);
      case EmailEventType.THREAD_MESSAGE_CREATED:
        return this.onThreadMessageCreated(event.payload);
      case EmailEventType.TICKET_CREATED:
        return this.onTicketCreated(event.payload);
      case EmailEventType.TICKET_REPLY_POSTED:
        return this.onTicketReplyPosted(event.payload);
      case EmailEventType.TICKET_STATUS_UPDATED:
        return this.onTicketStatusUpdated(event.payload);
      case EmailEventType.TICKET_PRIORITY_UPDATED:
        return this.onTicketPriorityUpdated(event.payload);
      case EmailEventType.TICKET_ASSIGNEE_UPDATED:
        return this.onTicketAssigneeUpdated(event.payload);
      case EmailEventType.TICKET_ATTACHMENT_ADDED:
        return this.onTicketAttachmentAdded(event.payload);
    }
  }

  //  Individual event handlers

  private async onProjectCreated(p: ProjectCreatedPayload): Promise<void> {
    const { subject, html } = buildProjectCreatedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    // Notify all members
    await this.sendBulk(p.members, subject, html);
  }

  private async onProjectAssigned(p: ProjectAssignedPayload): Promise<void> {
    const { subject, html } = buildProjectAssignedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    // Notify all members
    await this.sendBulk(p.members, subject, html);
  }

  private async onThreadMessageCreated(
    p: ThreadMessageCreatedPayload,
  ): Promise<void> {
    const { subject, html } = buildThreadMessageCreatedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    // Notify all participants
    await this.sendBulk(p.participants, subject, html);
  }

  private async onTicketCreated(p: TicketCreatedPayload): Promise<void> {
    const { subject, html } = buildTicketCreatedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    await this.sendBulk(p.participants, subject, html);
  }

  private async onTicketReplyPosted(
    p: TicketReplyPostedPayload,
  ): Promise<void> {
    const { subject, html } = buildTicketReplyEmail(
      p,
      this.appUrl,
      this.appName,
    );
    // Internal notes: exclude the poster themselves from the notification list
    const recipients = p.participants.filter(
      (r) => r.email !== p.postedBy.email,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketStatusUpdated(
    p: TicketStatusUpdatedPayload,
  ): Promise<void> {
    const { subject, html } = buildStatusUpdatedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    const recipients = p.participants.filter(
      (r) => r.email !== p.updatedBy.email,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketPriorityUpdated(
    p: TicketPriorityUpdatedPayload,
  ): Promise<void> {
    const { subject, html } = buildPriorityUpdatedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    const recipients = p.participants.filter(
      (r) => r.email !== p.updatedBy.email,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketAssigneeUpdated(
    p: TicketAssigneeUpdatedPayload,
  ): Promise<void> {
    const { subject, html } = buildAssigneeUpdatedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    // Always notify new assignee even if not in participants list
    const recipientSet = new Map<string, EmailRecipient>();
    for (const r of p.participants) recipientSet.set(r.email, r);
    recipientSet.set(p.newAssignee.email, p.newAssignee);
    recipientSet.delete(p.updatedBy.email); // don't notify the person who made the change

    await this.sendBulk([...recipientSet.values()], subject, html);
  }

  private async onTicketAttachmentAdded(
    p: TicketAttachmentAddedPayload,
  ): Promise<void> {
    const { subject, html } = buildAttachmentAddedEmail(
      p,
      this.appUrl,
      this.appName,
    );
    const recipients = p.participants.filter(
      (r) => r.email !== p.uploadedBy.email,
    );
    await this.sendBulk(recipients, subject, html);
  }

  // SendGrid send helpers

  /**
   * Send one email to multiple recipients as individual personalizations.
   * SendGrid supports up to 1000 personalizations per API call.
   */
  private async sendBulk(
    recipients: EmailRecipient[],
    subject: string,
    html: string,
  ): Promise<void> {
    if (!recipients.length) return;

    // Chunk into batches of 1000 (SendGrid limit)
    const chunks = this.chunk(recipients, 1000);

    for (const chunk of chunks) {
      const personalizations = chunk.map((r) => ({
        to: [{ email: r.email, name: r.name }],
      }));

      try {
        await sgMail.send({
          from: { email: this.fromEmail, name: this.fromName },
          subject,
          html,
          personalizations,
        });

        this.logger.log(
          `Email sent [${subject}] to ${chunk.length} recipient(s)`,
        );
      } catch (err: any) {
        this.logger.error(
          `SendGrid error [${subject}]: ${err?.message}`,
          err?.response?.body,
        );
        // Re-throw so callers (e.g. BullMQ job) can retry
        throw err;
      }
    }
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  }
}
