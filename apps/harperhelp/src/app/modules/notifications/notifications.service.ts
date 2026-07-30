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
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { NotificationsGateway } from './gateway/notifications.gateway';
import { NotifyProjectMembersDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { ActivityLogService } from '../activity/activity-log.service';
import { SearchNotificationsDto } from './dto/search-notification.dto';

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
    private readonly activityLogService: ActivityLogService,

    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    // @InjectRepository(ActivityLog)
    // private readonly activityLogService: Repository<ActivityLog>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly gateway: NotificationsGateway,
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
      appUrl: this.appUrl,
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

  // ====================================================================
  async notifyProjectMembers(dto: NotifyProjectMembersDto): Promise<void> {
    const recipientIds = await this.resolveRecipients(dto);
    if (recipientIds.length === 0) return;

    if (dto.skipCreate) {
      recipientIds.forEach((recipientId) => {
        this.gateway.emitNewNotification(
          recipientId,
          {
            recipientId,
            actorId: dto.actorId,
            projectId: dto.projectId,
            ticketId: dto.ticketId ?? null,
            type: dto.type,
            entityType: dto.entityType,
            entityId: dto.entityId,
            title: dto.title,
            message: dto.message ?? null,
            metadata: dto.metadata ?? {},
          } as unknown as Notification,
          0,
          true,
        );
      });

      return;
    }

    const rows = recipientIds.map((recipientId) =>
      this.notificationsRepo.create({
        recipientId,
        actorId: dto.actorId,
        projectId: dto.projectId,
        ticketId: dto.ticketId ?? null,
        type: dto.type,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: dto.title,
        message: dto.message ?? null,
        metadata: dto.metadata ?? {},
      }),
    );

    // Single multi-row INSERT, not N round trips
    const saved = await this.notificationsRepo.save(rows);

    for (const notification of saved) {
      const unreadCount = await this.getUnreadCount(notification.recipientId);
      this.gateway.emitNewNotification(
        notification.recipientId,
        notification,
        unreadCount,
      );
    }

    // TODO: Need to save the activity in the activity log table as well, so that it can be queried later for reporting purposes.

    await this.activityLogService.createActivity({
      actorId: dto.actorId,
      projectId: dto.projectId ?? null,
      ticketId: dto.ticketId ?? null,
      type: dto.type,
      entityType: dto.entityType,
      entityId: dto.entityId ?? null,
      metadata: dto.metadata ?? {},
    });
  }

  async search(dto: SearchNotificationsDto, user) {
    const qb = this.notificationsRepo
      .createQueryBuilder('notification')
      .where('notification.recipientId = :recipientId', {
        recipientId: user?.id,
      });

    if (dto.query) {
      qb.andWhere(
        `(
        notification.title ILIKE :query OR
        notification.message ILIKE :query
      )`,
        {
          query: `%${dto.query}%`,
        },
      );
    }

    return qb
      .orderBy('notification.createdAt', 'DESC')
      .take(dto.limit ?? 20)
      .skip(dto.offset ?? 0)
      .getMany();
  }

  private async resolveRecipients(
    dto: NotifyProjectMembersDto,
  ): Promise<string[]> {
    let recipientIds: string[];

    if (dto.explicitRecipientIds?.length) {
      recipientIds = [...new Set(dto.explicitRecipientIds)];
    } else if (dto.requiredClaimValue) {
      recipientIds = await this.getProjectMemberIdsWithClaim(
        dto.projectId,
        dto.requiredClaimValue,
      );
    } else {
      recipientIds = await this.getProjectMemberIds(dto.projectId);
    }

    // Never notify whoever caused the event
    return recipientIds.filter((id) => id !== dto.actorId);
  }

  /** All active users assigned to a project, via user_projects_join. */
  async getProjectMemberIds(projectId: string): Promise<string[]> {
    const rows: { usersId: string }[] = await this.dataSource.query(
      `
      SELECT upj."usersId"
      FROM user_projects_join upj
      INNER JOIN users u ON u.id = upj."usersId"
      WHERE upj."projectsId" = $1
        AND u."isActive" = true
        AND u."isDeleted" = false
      `,
      [projectId],
    );
    return rows.map((r) => r.usersId);
  }

  /**
   * Project members whose role grants a specific claim, e.g. ('view_internal_replies').
   * Roles/claims are global (user_roles has no projectId), so this intersects
   * project membership with the user's role_claims.
   */
  async getProjectMemberIdsWithClaim(
    projectId: string,
    claimValue: string,
  ): Promise<string[]> {
    const rows: { usersId: string }[] = await this.dataSource.query(
      `
      SELECT DISTINCT upj."usersId"
      FROM user_projects_join upj
      INNER JOIN users u ON u.id = upj."usersId"
      INNER JOIN user_roles ur ON ur."userId" = upj."usersId"
      INNER JOIN role_claims rc ON rc."roleId" = ur."roleId"
      WHERE upj."projectsId" = $1
        AND rc."claimValue" = $2
        AND u."isActive" = true
        AND u."isDeleted" = false
      `,
      [projectId, claimValue],
    );
    return rows.map((r) => r.usersId);
  }

  async findForUser(
    userId: string,
    {
      page = 1,
      limit = 20,
      unreadOnly = false,
    }: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const qb = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n."recipientId" = :userId', { userId })
      .andWhere('n."isActive" = true')
      .orderBy('n."createdAt"', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (unreadOnly) {
      qb.andWhere('n."isRead" = false');
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findTopForUser(userId: string, limit = 5): Promise<Notification[]> {
    return this.notificationsRepo.find({
      where: { recipientId: userId, isActive: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepo.count({
      where: { recipientId: userId, isRead: false, isActive: true },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationsRepo.update(
      { id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
    );
    const unreadCount = await this.getUnreadCount(userId);
    this.gateway.emitUnreadCount(userId, unreadCount);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepo.update(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    this.gateway.emitUnreadCount(userId, 0);
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
