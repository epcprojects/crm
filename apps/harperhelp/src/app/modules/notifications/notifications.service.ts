import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { adminInviteTemplate } from './templates/invite.email.template';
import { forgotPasswordTemplate } from './templates/forgot-password.email.template';
// import { User } from '../users/entities/user.entity';

import {
  EmailEventType,
  EmailNotificationEvent,
  EmailRecipient,
  // ProjectCreatedPayload,
  TicketCreatedPayload,
  TicketReplyPostedPayload,
  TicketInternalMessageEmailPayload,
  TicketStatusUpdatedPayload,
  TicketDueDateUpdatedPayload,
  TicketPriorityUpdatedPayload,
  TicketAssigneeUpdatedPayload,
  // TicketAttachmentAddedPayload,
  ProjectAssignedPayload,
  ThreadMessageCreatedPayload,
  ProjectUnassignedPayload,
  ThreadReplyCreatedPayload,
  getEmailNotificationEntityType,
  EMAIL_NOTIFICATION_METADATA,
  ThreadMessageMentionedPayload,
  ThreadReplyMentionedPayload,
  TicketReplyMentionedPayload,
  TicketInternalMessageMentionedPayload,
} from './notifications.types';
import {
  // buildProjectCreatedEmail,
  buildTicketCreatedEmail,
  buildTicketReplyEmail,
  buildStatusUpdatedEmail,
  buildDueDateUpdatedEmail,
  buildPriorityUpdatedEmail,
  buildAssigneeUpdatedEmail,
  buildTicketInternalMessageEmail,
  // buildAttachmentAddedEmail,
  buildProjectAssignedEmail,
  buildThreadMessageCreatedEmail,
  buildProjectUnassignedEmail,
  buildThreadReplyCreatedEmail,
  buildThreadMessageMentionedEmail,
  buildThreadReplyMentionedEmail,
  buildTicketReplyMentionedEmail,
  buildTicketInternalMessageMentionedEmail,
} from './templates/common';
import { SqsNotificationQueueService } from './queue/sqs-notification-queue.service';
import { Brackets, DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { NotificationsGateway } from './gateway/notifications.gateway';
import { NotifyProjectMembersDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';
import { ActivityLogService } from '../activity/activity-log.service';
import { SearchNotificationsDto } from './dto/search-notification.dto';
import {
  EmailNotificationEntityType,
  NotificationEntityType,
  NotificationType,
} from '@harperhelp/types';
import {
  CATEGORY_TO_ENTITY_TYPES,
  ENTITY_TYPE_TO_CATEGORY,
  MENTION_TYPES,
  NotificationCategory,
  resolveCategory,
} from './enum/notification-category.enum';
import { EmailNotificationPreference } from './entities/email-notification-preference.entity';
import { UserRole } from '../users/entities/user.roles.entity';
import { RoleClaim } from '../roles/entities/role.claim.entity';

interface CursorPage<T> {
  items: T[];
  hasMore: boolean;
  cursor: string | null;
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}_${id}`).toString('base64');
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const [createdAt, id] = decoded.split('_');

    if (!createdAt || !id || isNaN(Date.parse(createdAt))) {
      throw new Error('malformed cursor');
    }
    if (!UUID_REGEX.test(id)) {
      throw new Error('malformed cursor id');
    }

    return { createdAt, id };
  } catch {
    throw new BadRequestException('Invalid or corrupted cursor');
  }
}

const NOTIFICATION_GROUPS = [
  {
    category: 'projects',
    label: 'Projects',
  },
  {
    category: 'threads',
    label: 'Threads',
  },
  {
    category: 'tickets',
    label: 'Tickets',
  },
  {
    category: 'ticket_replies',
    label: 'Ticket Replies',
  },
] as const;

type NotificationGroupCategory =
  (typeof NOTIFICATION_GROUPS)[number]['category'];

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

    @InjectRepository(EmailNotificationPreference)
    private readonly emailNotificationPreferenceRepo: Repository<EmailNotificationPreference>,
    // @InjectRepository(User)
    // private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(RoleClaim)
    private readonly roleClaimRepo: Repository<RoleClaim>,

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

  isSupportedCategory(category: string): category is NotificationGroupCategory {
    return NOTIFICATION_GROUPS.some((group) => group.category === category);
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
    //here
    if (this.queueUrl) {
      await this.queueService.publish(event);
      return;
    }

    console.debug(`Dispatching notification event ${event.type} directly`);

    switch (event.type) {
      // case EmailEventType.PROJECT_CREATED:
      //   return this.onProjectCreated(event.payload); // not needed
      case EmailEventType.PROJECT_ASSIGNED:
        return this.onProjectAssigned(event.payload);
      case EmailEventType.PROJECT_UNASSIGNED:
        return this.onProjectUnassigned(event.payload);
      case EmailEventType.THREAD_MESSAGE_CREATED: // done
        return this.onThreadMessageCreated(event.payload);
      case EmailEventType.MENTIONED_IN_THREAD_MESSAGE:
        return this.onThreadMessageMentioned(event.payload);
      case EmailEventType.THREAD_REPLY_CREATED: // done
        return this.onThreadReplyCreated(event.payload);
      case EmailEventType.MENTIONED_IN_THREAD_REPLY:
        return this.onThreadReplyMentioned(event.payload);
      case EmailEventType.TICKET_CREATED: // done
        return this.onTicketCreated(event.payload);
      case EmailEventType.TICKET_REPLY_POSTED: // almost done
        return this.onTicketReplyPosted(event.payload);
      case EmailEventType.MENTIONED_IN_TICKET_REPLY:
        return this.onTicketReplyMentioned(event.payload);
      case EmailEventType.TICKET_INTERNAL_MESSAGE: // done
        return this.onTicketInternalMessageEmail(event.payload);
      case EmailEventType.MENTIONED_IN_TICKET_INTERNAL_MESSAGE:
        return this.onTicketInternalMessageMentioned(event.payload);
      case EmailEventType.TICKET_STATUS_UPDATED:
        return this.onTicketStatusUpdated(event.payload);
      case EmailEventType.TICKET_DUE_DATE_UPDATED:
        return this.onTicketDueDateUpdated(event.payload);
      case EmailEventType.TICKET_PRIORITY_UPDATED:
        return this.onTicketPriorityUpdated(event.payload);
      case EmailEventType.TICKET_ASSIGNEE_UPDATED:
        return this.onTicketAssigneeUpdated(event.payload);
      // case EmailEventType.TICKET_ATTACHMENT_ADDED:
      //   return this.onTicketAttachmentAdded(event.payload);
    }
  }

  //  Individual event handlers

  // private async onProjectCreated(p: ProjectCreatedPayload): Promise<void> {
  //   const { subject, html } = buildProjectCreatedEmail(
  //     p,
  //     this.appUrl,
  //     // this.appName,
  //   );
  //   // Internal notes: exclude the poster themselves from the notification list
  //   const recipients = p.members.filter((r) => r.email !== p.createdBy.email);
  //   // Notify all members
  //   await this.sendBulk(recipients, subject, html);
  // }

  private async onProjectAssigned(p: ProjectAssignedPayload): Promise<void> {
    const { subject, html } = buildProjectAssignedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    const recipients = p.assignedTo ? [p.assignedTo] : [];
    // Notify all members
    await this.sendBulk(recipients, subject, html);
  }

  private async onProjectUnassigned(
    p: ProjectUnassignedPayload,
  ): Promise<void> {
    const { subject, html } = buildProjectUnassignedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    // Internal notes: exclude the poster themselves from the notification list
    // const recipients = p.members.filter((r) => r.email !== p.createdBy.email);
    // Notify all members
    await this.sendBulk([p.unassignedFrom], subject, html);
  }

  private async onThreadMessageCreated(
    p: ThreadMessageCreatedPayload,
  ): Promise<void> {
    const { subject, html } = buildThreadMessageCreatedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    // Internal notes: exclude the poster themselves from the notification list
    const recipients = p.participants.filter(
      (r) => r.email !== p.createdBy.email && r.isInvitationAccepted === true,
    );
    // Notify all members
    await this.sendBulk(recipients, subject, html);
    // Notify all participants
    // await this.sendBulk(p.participants, subject, html);
  }
  private async onThreadReplyCreated(
    p: ThreadReplyCreatedPayload,
  ): Promise<void> {
    const { subject, html } = buildThreadReplyCreatedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    // Internal notes: exclude the poster themselves from the notification list
    const recipients = p.participants.filter(
      (r) => r.email !== p.createdBy.email && r.isInvitationAccepted === true,
    );
    // Notify all members
    await this.sendBulk(recipients, subject, html);
    // Notify all participants
    // await this.sendBulk(p.participants, subject, html);
  }

  private async onTicketCreated(p: TicketCreatedPayload): Promise<void> {
    const { subject, html } = buildTicketCreatedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    // Internal notes: exclude the poster themselves from the notification list
    const recipients = p.participants.filter(
      (r) => r.email !== p.createdBy.email && r.isInvitationAccepted === true,
    );
    // Notify all members
    await this.sendBulk(recipients, subject, html);
    // await pthis.sendBulk(p.participants, subject, html);
  }

  private async onTicketReplyPosted(
    p: TicketReplyPostedPayload,
  ): Promise<void> {
    const { subject, html } = buildTicketReplyEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    // Internal notes: exclude the poster themselves from the notification list
    const recipients = p.participants.filter(
      (r) => r.email !== p.postedBy.email && r.isInvitationAccepted === true,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketInternalMessageEmail(
    p: TicketInternalMessageEmailPayload,
  ): Promise<void> {
    const { subject, html } = buildTicketInternalMessageEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    // Internal notes: exclude the poster themselves from the notification list
    const recipients = p.participants.filter(
      (r) => r.email !== p.postedBy.email && r.isInvitationAccepted === true,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketStatusUpdated(
    p: TicketStatusUpdatedPayload,
  ): Promise<void> {
    const { subject, html } = buildStatusUpdatedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    const recipients = p.participants.filter(
      (r) => r.email !== p.updatedBy.email && r.isInvitationAccepted === true,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketDueDateUpdated(
    p: TicketDueDateUpdatedPayload,
  ): Promise<void> {
    console.debug('onTicketDueDateUpdated payload:', p);
    const { subject, html } = buildDueDateUpdatedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    const recipients = p.participants.filter(
      (r) => r.email !== p.updatedBy.email && r.isInvitationAccepted === true,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketPriorityUpdated(
    p: TicketPriorityUpdatedPayload,
  ): Promise<void> {
    const { subject, html } = buildPriorityUpdatedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    const recipients = p.participants.filter(
      (r) => r.email !== p.updatedBy.email && r.isInvitationAccepted === true,
    );
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketAssigneeUpdated(
    p: TicketAssigneeUpdatedPayload,
  ): Promise<void> {
    const { subject, html } = buildAssigneeUpdatedEmail(
      p,
      this.appUrl,
      // this.appName,
    );
    // Always notify new assignee even if not in participants list
    const recipients = p.participants.filter(
      (r) => r.email !== p.updatedBy.email && r.isInvitationAccepted === true,
    );

    await this.sendBulk(recipients, subject, html);
  }
  private async onThreadMessageMentioned(
    p: ThreadMessageMentionedPayload,
  ): Promise<void> {
    const { subject, html } = buildThreadMessageMentionedEmail(p, this.appUrl);
    // Single recipient — the person who was mentioned. Guard against self-mention.
    const recipients =
      p.mentionedUser.email !== p.mentionedBy.email ? [p.mentionedUser] : [];
    await this.sendBulk(recipients, subject, html);
  }

  private async onThreadReplyMentioned(
    p: ThreadReplyMentionedPayload,
  ): Promise<void> {
    const { subject, html } = buildThreadReplyMentionedEmail(p, this.appUrl);
    const recipients =
      p.mentionedUser.email !== p.mentionedBy.email ? [p.mentionedUser] : [];
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketReplyMentioned(
    p: TicketReplyMentionedPayload,
  ): Promise<void> {
    const { subject, html } = buildTicketReplyMentionedEmail(p, this.appUrl);
    const recipients =
      p.mentionedUser.email !== p.mentionedBy.email ? [p.mentionedUser] : [];
    await this.sendBulk(recipients, subject, html);
  }

  private async onTicketInternalMessageMentioned(
    p: TicketInternalMessageMentionedPayload,
  ): Promise<void> {
    const { subject, html } = buildTicketInternalMessageMentionedEmail(
      p,
      this.appUrl,
    );
    const recipients =
      p.mentionedUser.email !== p.mentionedBy.email ? [p.mentionedUser] : [];
    await this.sendBulk(recipients, subject, html);
  }

  // private async onTicketAttachmentAdded(
  //   p: TicketAttachmentAddedPayload,
  // ): Promise<void> {
  //   const { subject, html } = buildAttachmentAddedEmail(
  //     p,
  //     this.appUrl,
  //     // this.appName,
  //   );
  //   const recipients = p.participants.filter(
  //     (r) => r.email !== p.uploadedBy.email && r.isInvitationAccepted === true,
  //   );
  //   await this.sendBulk(recipients, subject, html);
  // }

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

    // Create activity
    if (
      dto.entityType === NotificationEntityType.PROJECT &&
      [
        NotificationType.PROJECT_ASSIGNED,
        NotificationType.PROJECT_UNASSIGNED,
      ].includes(dto.type)
    ) {
      // One activity per affected recipient
      for (const notification of saved) {
        await this.activityLogService.createActivity({
          recipientId: notification.recipientId,
          actorId: dto.actorId,
          projectId: dto.projectId ?? null,
          ticketId: dto.ticketId ?? null,
          type: dto.type,
          title: dto.title,
          entityType: dto.entityType,
          entityId: dto.entityId ?? null,
          metadata: dto.metadata ?? {},
        });
      }
    } else {
      // Normal project activity → ONE activity
      await this.activityLogService.createActivity({
        recipientId: null,
        actorId: dto.actorId,
        projectId: dto.projectId ?? null,
        ticketId: dto.ticketId ?? null,
        type: dto.type,
        title: dto.title,
        entityType: dto.entityType,
        entityId: dto.entityId ?? null,
        metadata: dto.metadata ?? {},
      });
    }
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

  private readonly entityPermissionClaims: Partial<
    Record<NotificationEntityType, string[]>
  > = {
    [NotificationEntityType.TICKET]: ['tickets:view_list', 'tickets.view_list'],
    [NotificationEntityType.TICKET_REPLY]: [
      'ticket_replies:view',
      'ticket_replies.view',
    ],
    [NotificationEntityType.INTERNAL_MESSAGE]: [
      'tickets:internal_chat',
      'tickets.internal_chat',
    ],
    [NotificationEntityType.THREAD_MESSAGE]: ['thread:view', 'thread.view'],
    [NotificationEntityType.EVENT]: [
      'calendar:view_grid',
      'calendar.view_grid',
    ],
  };

  private async resolveRecipients(
    dto: NotifyProjectMembersDto,
  ): Promise<string[]> {
    let recipientIds: string[];

    if (dto.explicitRecipientIds?.length) {
      recipientIds = [...new Set(dto.explicitRecipientIds)];
    } else {
      recipientIds = await this.getProjectMemberIds(dto.projectId);
    }

    // Never notify whoever caused the event
    recipientIds = recipientIds.filter((id) => id !== dto.actorId);

    // Permission gate — applies regardless of how the list was built
    recipientIds = await this.filterRecipientsByEntityPermission(
      recipientIds,
      dto.entityType,
    );

    return recipientIds;
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
   * Drops any userId whose role doesn't carry a claim required for this
   * entityType. Entity types with no entry in entityPermissionClaims (PROJECT,
   * MEMBER) are always allowed through untouched. Every user always has a
   * role, so "no matching claim" is the only drop condition (fail-closed).
   */
  private async filterRecipientsByEntityPermission(
    userIds: string[],
    entityType: NotificationEntityType,
  ): Promise<string[]> {
    if (!userIds.length) return userIds;

    const requiredClaimTypes = this.entityPermissionClaims[entityType];
    if (!requiredClaimTypes?.length) {
      return userIds; // not gated
    }

    const rows: { userId: string }[] = await this.dataSource.query(
      `
    SELECT DISTINCT ur."userId"
    FROM user_roles ur
    INNER JOIN role_claims rc ON rc."roleId" = ur."roleId"
    WHERE ur."userId" = ANY($1)
      AND rc."claimType" = ANY($2)
      AND LOWER(rc."claimValue") = 'true'
    `,
      [userIds, requiredClaimTypes],
    );

    const permitted = new Set(rows.map((r) => r.userId));
    return userIds.filter((id) => permitted.has(id));
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

  async findGroupedForUser(
    userId: string,
    {
      limitPerGroup = 5,
      unreadOnly = false,
    }: { limitPerGroup?: number; unreadOnly?: boolean },
  ) {
    const groups = await Promise.all(
      NOTIFICATION_GROUPS.map(async (group) => {
        const query = this.applyNotificationCategoryFilter(
          this.buildUserNotificationQuery(userId, unreadOnly),
          group.category,
        );
        const [items, total] = await query
          .take(limitPerGroup)
          .getManyAndCount();

        return {
          category: group.category,
          label: group.label,
          count: total,
          items,
          nextOffset: items.length,
          hasMore: items.length < total,
        };
      }),
    );

    return {
      groups,
      total: groups.reduce((sum, group) => sum + group.count, 0),
      limitPerGroup,
    };
  }

  async findCategoryForUser(
    userId: string,
    {
      category,
      limit = 5,
      offset = 0,
      unreadOnly = false,
    }: {
      category: NotificationGroupCategory;
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    },
  ) {
    const group = NOTIFICATION_GROUPS.find(
      (item) => item.category === category,
    );
    const query = this.applyNotificationCategoryFilter(
      this.buildUserNotificationQuery(userId, unreadOnly),
      category,
    );
    const [items, total] = await query
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      category,
      label: group?.label ?? category,
      count: total,
      items,
      nextOffset: offset + items.length,
      hasMore: offset + items.length < total,
    };
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

  private buildUserNotificationQuery(userId: string, unreadOnly: boolean) {
    const qb = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n."recipientId" = :userId', { userId })
      .andWhere('n."isActive" = true')
      .orderBy('n."createdAt"', 'DESC');

    if (unreadOnly) {
      qb.andWhere('n."isRead" = false');
    }

    return qb;
  }

  private applyNotificationCategoryFilter(
    qb: SelectQueryBuilder<Notification>,
    category: NotificationGroupCategory,
  ) {
    switch (category) {
      case 'projects':
        qb.andWhere(
          new Brackets((subQuery) => {
            subQuery
              .where('n."entityType" = :projectEntityType', {
                projectEntityType: NotificationEntityType.PROJECT,
              })
              .orWhere('n."type" IN (:...projectTypes)', {
                projectTypes: [
                  NotificationType.PROJECT_ASSIGNED,
                  NotificationType.PROJECT_UNASSIGNED,
                  NotificationType.PROJECT_UPDATED,
                  NotificationType.PROJECT_DELETED,
                  NotificationType.EVENT_CREATED,
                  NotificationType.EVENT_UPDATED,
                  NotificationType.EVENT_DELETED,
                  NotificationType.MEMBER_JOINED,
                  NotificationType.MEMBER_LEFT,
                  NotificationType.MEMBER_UPDATED,
                ],
              });
          }),
        );
        break;
      case 'threads':
        qb.andWhere(
          new Brackets((subQuery) => {
            subQuery
              .where('n."entityType" = :threadEntityType', {
                threadEntityType: NotificationEntityType.THREAD_MESSAGE,
              })
              .orWhere('n."type" IN (:...threadTypes)', {
                threadTypes: [
                  NotificationType.THREAD_CREATED,
                  NotificationType.THREAD_REPLY,
                  NotificationType.THREAD_MESSAGE_REACTION,
                  NotificationType.MENTIONED_IN_THREAD_MESSAGE,
                ],
              });
          }),
        );
        break;
      case 'tickets':
        qb.andWhere(
          new Brackets((subQuery) => {
            subQuery
              .where('n."entityType" = :ticketEntityType', {
                ticketEntityType: NotificationEntityType.TICKET,
              })
              .orWhere('n."type" IN (:...ticketTypes)', {
                ticketTypes: [
                  NotificationType.TICKET_CREATED,
                  NotificationType.TICKET_STATUS_CHANGED,
                  NotificationType.TICKET_PRIORITY_CHANGED,
                  NotificationType.TICKET_ASSIGNEE_CHANGED,
                  NotificationType.TICKET_TITLE_CHANGED,
                  NotificationType.TICKET_DESCRIPTION_CHANGED,
                  NotificationType.TICKET_DUE_DATE_CHANGED,
                  NotificationType.TICKET_DELETED,
                ],
              });
          }),
        );
        break;
      case 'ticket_replies':
        qb.andWhere(
          new Brackets((subQuery) => {
            subQuery
              .where('n."entityType" = :ticketReplyEntityType', {
                ticketReplyEntityType: NotificationEntityType.TICKET_REPLY,
              })
              .orWhere('n."entityType" = :internalMessageEntityType', {
                internalMessageEntityType:
                  NotificationEntityType.INTERNAL_MESSAGE,
              })
              .orWhere('n."type" IN (:...ticketReplyTypes)', {
                ticketReplyTypes: [
                  NotificationType.TICKET_REPLY,
                  NotificationType.TICKET_REPLY_REACTION,
                  NotificationType.MENTIONED_IN_TICKET_REPLY,
                  NotificationType.INTERNAL_MESSAGE,
                  NotificationType.INTERNAL_MESSAGE_REACTION,
                  NotificationType.MENTIONED_IN_INTERNAL_MESSAGE,
                ],
              });
          }),
        );
        break;
    }

    return qb;
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

  async findCategorized(
    userId: string,
    dto: {
      category?: NotificationCategory;
      cursor?: string;
      limit?: number;
      unreadOnly?: boolean;
    },
  ) {
    const limit = dto.limit ?? 5;
    const unreadOnly = dto.unreadOnly ?? false;

    if (dto.category) {
      const page = await this.fetchCategoryPage(
        userId,
        dto.category,
        limit,
        dto.cursor,
        unreadOnly,
      );
      return { category: dto.category, ...page };
    }

    const categories = Object.values(NotificationCategory);
    const entries = await Promise.all(
      categories.map(
        async (cat) =>
          [
            cat,
            await this.fetchCategoryPage(
              userId,
              cat,
              limit,
              undefined,
              unreadOnly,
            ),
          ] as const,
      ),
    );
    return Object.fromEntries(entries);
  }
  private async fetchCategoryPage(
    userId: string,
    category: NotificationCategory,
    limit: number,
    cursor?: string,
    unreadOnly?: boolean,
  ): Promise<CursorPage<any>> {
    const qb = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n."recipientId" = :userId', { userId })
      .andWhere('n."isActive" = true')
      .orderBy('n."createdAt"', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .take(limit + 1);

    if (category === NotificationCategory.MENTIONS) {
      qb.andWhere('n."type" IN (:...mentionTypes)', {
        mentionTypes: MENTION_TYPES,
      });
    } else {
      const entityTypes = CATEGORY_TO_ENTITY_TYPES[category];
      qb.andWhere('n."entityType" IN (:...entityTypes)', { entityTypes });
      // exclude mentions so they don't also show up under ticket_replies/threads/internal_messages
      qb.andWhere('n."type" NOT IN (:...mentionTypes)', {
        mentionTypes: MENTION_TYPES,
      });
    }

    if (unreadOnly) {
      qb.andWhere('n."isRead" = false');
    }

    if (cursor) {
      const { createdAt, id } = decodeCursor(cursor);
      qb.andWhere(
        '(n."createdAt" < :cCreatedAt OR (n."createdAt" = :cCreatedAt AND n.id < :cId))',
        { cCreatedAt: createdAt, cId: id },
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];

    return {
      items,
      hasMore,
      cursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
    };
  }

  /** Grouped, unpaginated — independent of whatever page the list is scrolled to. */
  async getUnreadCountsByCategory(userId: string): Promise<{
    totalCount: number;
    totalUnreadCount: number;
    categoryUnreadCounts: Record<NotificationCategory, number>;
  }> {
    const rows = await this.notificationsRepo
      .createQueryBuilder('n')
      .select('n."entityType"', 'entityType')
      .addSelect('n."type"', 'type')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE n."isRead" = false)', 'unread')
      .where('n."recipientId" = :userId', { userId })
      .andWhere('n."isActive" = true')
      .groupBy('n."entityType"')
      .addGroupBy('n."type"')
      .getRawMany<{
        entityType: NotificationEntityType;
        type: NotificationType;
        total: string;
        unread: string;
      }>();

    const categoryUnreadCounts = Object.values(NotificationCategory).reduce(
      (acc, cat) => ({ ...acc, [cat]: 0 }),
      {} as Record<NotificationCategory, number>,
    );
    let totalCount = 0;
    let totalUnreadCount = 0;

    for (const row of rows) {
      const category = resolveCategory(row.entityType, row.type);
      const total = parseInt(row.total, 10);
      const unread = parseInt(row.unread, 10);

      categoryUnreadCounts[category] += unread;
      totalCount += total;
      totalUnreadCount += unread;
    }

    return { totalCount, totalUnreadCount, categoryUnreadCounts };
  }

  private readonly claimGatedNotificationGroups: Array<{
    claimTypes: string[];
    eventTypes: EmailEventType[];
  }> = [
    {
      claimTypes: ['tickets:view_list', 'tickets.view_list'],
      eventTypes: [
        EmailEventType.TICKET_CREATED,
        // EmailEventType.TICKET_REPLY_POSTED,
        EmailEventType.TICKET_STATUS_UPDATED,
        EmailEventType.TICKET_PRIORITY_UPDATED,
        EmailEventType.TICKET_ASSIGNEE_UPDATED,
        EmailEventType.TICKET_DUE_DATE_UPDATED,
        // EmailEventType.MENTIONED_IN_TICKET_REPLY,
        // EmailEventType.TICKET_INTERNAL_MESSAGE,
        // EmailEventType.TICKET_ATTACHMENT_ADDED,
      ],
    },
    {
      claimTypes: ['ticket_replies:view', 'ticket_replies.view'],
      eventTypes: [
        EmailEventType.TICKET_REPLY_POSTED,
        EmailEventType.MENTIONED_IN_TICKET_REPLY,
      ],
    },
    {
      claimTypes: ['tickets:internal_chat', 'tickets.internal_chat'],
      eventTypes: [
        EmailEventType.TICKET_INTERNAL_MESSAGE,
        EmailEventType.MENTIONED_IN_TICKET_INTERNAL_MESSAGE,
      ],
    },
    {
      claimTypes: ['thread:view', 'thread.view'],
      eventTypes: [
        EmailEventType.THREAD_MESSAGE_CREATED,
        EmailEventType.THREAD_REPLY_CREATED,
        EmailEventType.MENTIONED_IN_THREAD_MESSAGE,
        EmailEventType.MENTIONED_IN_THREAD_REPLY,
      ],
    },
  ];

  // Not gated by any claim — every user has a project, so these are always on.
  private readonly alwaysOnNotificationTypes: EmailEventType[] = [
    // EmailEventType.PROJECT_CREATED,
    EmailEventType.PROJECT_ASSIGNED,
    EmailEventType.PROJECT_UNASSIGNED,
  ];

  async ensureEmailNotificationPreferences(userId: string): Promise<void> {
    console.debug(`Ensuring email notification preferences for user ${userId}`);
    const userRole = await this.userRoleRepo.findOne({ where: { userId } });

    const roleClaims = userRole
      ? await this.roleClaimRepo.find({ where: { roleId: userRole.roleId } })
      : [];

    console.debug(
      `User ${userId} has role ${userRole?.roleId} with claims: ${roleClaims.map((c) => c.claimType).join(', ')}`,
    );

    const claimMap = new Map<string, boolean>(
      roleClaims.map((claim) => [
        claim.claimType,
        claim.claimValue.trim().toLowerCase() === 'true',
      ]),
    );

    console.debug(`Claim map for user ${userId}:`, claimMap);
    // Every EmailEventType this user is currently entitled to.
    const permittedTypes = new Set<EmailEventType>(
      this.alwaysOnNotificationTypes,
    );
    for (const group of this.claimGatedNotificationGroups) {
      const hasClaim = group.claimTypes.some(
        (claimType) => claimMap.get(claimType) === true,
      );
      if (hasClaim) {
        group.eventTypes.forEach((type) => permittedTypes.add(type));
      }
    }
    console.debug(
      `Permitted email notification types for user ${userId}:`,
      Array.from(permittedTypes),
    );

    const existing = await this.emailNotificationPreferenceRepo.find({
      where: { userId },
    });
    const existingByType = new Map(
      existing.map((preference) => [preference.notificationType, preference]),
    );

    const toInsert: EmailNotificationPreference[] = [];
    // const toDisable: EmailNotificationPreference[] = [];
    const toRemove: EmailNotificationPreference[] = [];

    for (const notificationType of Object.values(EmailEventType)) {
      const isPermitted = permittedTypes.has(notificationType);
      const existingRow = existingByType.get(notificationType);

      if (isPermitted && !existingRow) {
        // Newly permitted, no row yet -> create enabled.
        toInsert.push(
          this.emailNotificationPreferenceRepo.create({
            userId,
            entityType: getEmailNotificationEntityType(notificationType),
            notificationType,
            enabled: true,
          }),
        );
      } else if (!isPermitted && existingRow) {
        // No longer permitted ->delete.
        toRemove.push(existingRow);
        // existingRow.enabled = false;
        // toDisable.push(existingRow);
      }
      // isPermitted && existingRow -> leave untouched (respects manual toggle)
      // !isPermitted && (!existingRow || already disabled) -> nothing to do
    }
    console.debug(`To insert for user ${userId}:`, toInsert);
    console.debug(`To remove for user ${userId}:`, toRemove);
    if (toInsert.length > 0) {
      console.debug(
        `Inserting ${toInsert.length} email notification preferences for user ${userId}`,
      );
      console.debug('Inserting rows:', toInsert);
      await this.emailNotificationPreferenceRepo.save(toInsert);
    }
    if (toRemove.length > 0) {
      console.debug(
        `Removing ${toRemove.length} email notification preferences for user ${userId}`,
      );
      console.debug('Removing rows:', toRemove);
      await this.emailNotificationPreferenceRepo.remove(toRemove);
    }
  }

  async filterEmailRecipients(
    recipients: EmailRecipient[],
    notificationType: EmailEventType,
  ): Promise<EmailRecipient[]> {
    if (!recipients.length) {
      return [];
    }

    const userIds = [
      ...new Set(
        recipients.map((recipient) => recipient.userId).filter(Boolean),
      ),
    ];

    if (!userIds.length) {
      return recipients;
    }

    const preferences = await this.emailNotificationPreferenceRepo.find({
      where: userIds.map((userId) => ({
        userId,
        notificationType,
      })),
    });

    const preferenceMap = new Map(
      preferences.map((preference) => [preference.userId, preference.enabled]),
    );

    return recipients.filter((recipient) => {
      // Only send if a preference row exists and is explicitly enabled
      return preferenceMap.get(recipient.userId) === true;
    });
  }

  async getEmailPreferences(userId: string) {
    const preferences = await this.emailNotificationPreferenceRepo.find({
      where: {
        userId,
      },
      select: {
        id: true,
        entityType: true,
        notificationType: true,
        enabled: true,
      },
      order: {
        notificationType: 'ASC',
      },
    });
    return preferences.map((preference) => ({
      ...preference,
      title:
        EMAIL_NOTIFICATION_METADATA[preference.notificationType]?.label ??
        preference.notificationType,
    }));

    // return preferences;
  }

  async updateEmailPreference(
    userId: string,
    notificationType: string,
    enabled: boolean,
  ) {
    if (!this.isValidEmailNotificationType(notificationType)) {
      throw new BadRequestException(
        `Invalid notification type: ${notificationType}`,
      );
    }
    const entityType = getEmailNotificationEntityType(notificationType);

    const preference = await this.emailNotificationPreferenceRepo.findOne({
      where: {
        userId,
        notificationType,
      },
    });
    let saved;
    if (preference) {
      preference.enabled = enabled;
      preference.entityType = entityType;
      saved = await this.emailNotificationPreferenceRepo.save(preference);

      // return this.emailNotificationPreferenceRepo.save(preference);
    } else {
      saved = await this.emailNotificationPreferenceRepo.save({
        userId,
        entityType,
        notificationType,
        enabled,
      });
    }

    return {
      id: saved.id,
      entityType: saved.entityType,
      notificationType: saved.notificationType,
      enabled: saved.enabled,
      title:
        EMAIL_NOTIFICATION_METADATA[saved.notificationType]?.label ??
        saved.notificationType,
    };
  }

  private isValidEmailNotificationType(
    notificationType: string,
  ): notificationType is EmailEventType {
    return Object.values(EmailEventType).includes(
      notificationType as EmailEventType,
    );
  }
}
