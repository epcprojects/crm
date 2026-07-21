import {
  ProjectCreatedPayload,
  TicketCreatedPayload,
  TicketReplyPostedPayload,
  TicketStatusUpdatedPayload,
  TicketPriorityUpdatedPayload,
  TicketAssigneeUpdatedPayload,
  TicketAttachmentAddedPayload,
  ProjectAssignedPayload,
  ThreadMessageCreatedPayload,
} from '../notifications.types';

// Shared HTML shell

const COLORS = {
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  muted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F9FAFB',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: COLORS.danger,
  high: '#F97316',
  medium: COLORS.warning,
  low: COLORS.success,
};

const STATUS_COLOR: Record<string, string> = {
  open: COLORS.info,
  in_progress: COLORS.primary,
  resolved: COLORS.success,
  closed: COLORS.muted,
  on_hold: COLORS.warning,
};

function shell(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#F3F4F6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    .wrapper { max-width:620px; margin:32px auto; }
    .card { background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); }
    .header { background:${COLORS.primary}; padding:24px 32px; }
    .header h1 { margin:0; color:#fff; font-size:18px; font-weight:600; }
    .header p { margin:4px 0 0; color:rgba(255,255,255,.75); font-size:13px; }
    .body { padding:28px 32px; }
    .footer { padding:16px 32px; background:${COLORS.bg}; border-top:1px solid ${COLORS.border}; }
    .footer p { margin:0; font-size:12px; color:${COLORS.muted}; }
    .badge { display:inline-block; padding:2px 10px; border-radius:99px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.4px; }
    .meta-row { display:flex; gap:8px; align-items:center; margin:6px 0; font-size:14px; color:#374151; }
    .meta-label { color:${COLORS.muted}; width:110px; flex-shrink:0; }
    .divider { border:none; border-top:1px solid ${COLORS.border}; margin:20px 0; }
    .btn { display:inline-block; padding:10px 22px; background:${COLORS.primary}; color:#fff; text-decoration:none; border-radius:6px; font-size:14px; font-weight:600; }
    .comment-box { background:${COLORS.bg}; border-left:3px solid ${COLORS.primary}; border-radius:0 6px 6px 0; padding:14px 16px; margin:16px 0; font-size:14px; color:#374151; line-height:1.6; }
    .internal-banner { background:#FEF3C7; border:1px solid #FDE68A; border-radius:6px; padding:10px 14px; margin-bottom:16px; font-size:13px; color:#92400E; }
    .change-row { display:flex; align-items:center; gap:12px; font-size:14px; margin:12px 0; }
    .change-arrow { color:${COLORS.muted}; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      ${body}
    </div>
    <div style="padding:12px 0; text-align:center;">
      <p style="font-size:11px;color:#9CA3AF;margin:0;">
        You are receiving this because you are a participant on this project.
        Manage your notification preferences in your account settings.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function header(title: string, sub: string): string {
  return `<div class="header"><h1>${title}</h1><p>${sub}</p></div>`;
}

function footer(appName: string, appUrl: string): string {
  return `<div class="footer"><p>${appName} &mdash; <a href="${appUrl}" style="color:${COLORS.primary};">${appUrl}</a></p></div>`;
}

function badge(text: string, color: string): string {
  return `<span class="badge" style="background:${color}20;color:${color};">${text}</span>`;
}

//  Template builders

export function buildProjectCreatedEmail(
  p: ProjectCreatedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const memberList = p.members
    .map(
      (m) =>
        `<li style="font-size:14px;color:#374151;margin:3px 0;">${m.name} &lt;${m.email}&gt;</li>`,
    )
    .join('');

  const body = `
    ${header('🎉 New Project Created', appName)}
    <div class="body">
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">${p.projectName}</p>
      <div class="meta-row"><span class="meta-label">Project Code</span><strong>${p.projectCode}</strong></div>
      <div class="meta-row"><span class="meta-label">Created By</span>${p.createdBy.name}</div>
      ${p.description ? `<div class="meta-row"><span class="meta-label">Description</span>${p.description}</div>` : ''}
      <hr class="divider" />
      <p style="font-size:13px;color:${COLORS.muted};margin:0 0 8px;">Team Members</p>
      <ul style="margin:0;padding-left:18px;">${memberList}</ul>
      <hr class="divider" />
      <a href="${appUrl}/projects/${p.projectId}" class="btn">View Project</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `[${p.projectCode}] Project "${p.projectName}" has been created`,
    html: shell(
      `New Project: ${p.projectName}`,
      `${p.createdBy.name} created a new project`,
      body,
    ),
  };
}

export function buildProjectAssignedEmail(
  p: ProjectAssignedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const body = `
    ${header('🎉 Project Assigned', appName)}
    <div class="body">
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">${p.projectName}</p>
      <div class="meta-row"><span class="meta-label">Assigned By</span>${p.createdBy.name}</div>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `Project "${p.projectName}" has been assigned to you`,
    html: shell(
      `Project Assigned: ${p.projectName}`,
      `${p.createdBy.name} assigned you to a new project`,
      body,
    ),
  };
}

export function buildTicketCreatedEmail(
  p: TicketCreatedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const priorityColor =
    PRIORITY_COLOR[p.priority.toLowerCase()] ?? COLORS.muted;
  const statusColor = STATUS_COLOR[p.status.toLowerCase()] ?? COLORS.muted;

  const body = `
    ${header('🎫 New Ticket Created', p.projectName)}
    <div class="body">
      <p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">${p.ticketNumber}</p>
      <p style="margin:0 0 18px;font-size:16px;color:#111827;font-weight:600;">${p.title}</p>
      <div class="meta-row"><span class="meta-label">Status</span>${badge(p.status, statusColor)}</div>
      <div class="meta-row"><span class="meta-label">Priority</span>${badge(p.priority, priorityColor)}</div>
      <div class="meta-row"><span class="meta-label">Created By</span>${p.createdBy.name}</div>
      ${p.assignee ? `<div class="meta-row"><span class="meta-label">Assigned To</span>${p.assignee.name}</div>` : ''}
      <hr class="divider" />
      <p style="font-size:13px;color:${COLORS.muted};margin:0 0 8px;">Description</p>
      ${p.description ? `<div class="comment-box">${p.description}</div>` : ''}
      <hr class="divider" />
      <a href="${appUrl}/tickets/${p.ticketId}?projectId=${p.projectId}" class="btn" style="text-decoration:none;color:#ffffff;padding:8px 16px;border-radius:4px;display:inline-block;">View Ticket</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `[${p.ticketNumber}] New ticket: ${p.title}`,
    html: shell(
      `New Ticket: ${p.title}`,
      `${p.createdBy.name} opened a new ticket`,
      body,
    ),
  };
}

export function buildTicketReplyEmail(
  p: TicketReplyPostedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const channelLabel = p.isInternal
    ? 'Internal Note (Team Only)'
    : 'Client Reply';

  const body = `
    ${header('💬 New Reply on Ticket', p.projectName)}
    <div class="body">
      <p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">${p.ticketNumber}</p>
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">${p.ticketTitle}</p>
      ${p.isInternal ? `<div class="internal-banner">🔒 <strong>Internal Note</strong> — visible to team members only</div>` : ''}
      <div class="meta-row"><span class="meta-label">Posted By</span>${p.postedBy.name}</div>
      <hr class="divider" />
      ${p.replyContent ? `<div class="comment-box">${p.replyContent}</div>` : ''}
      <hr class="divider" />
      <a href="${appUrl}/tickets/${p.ticketId}?projectId=${p.projectId}" class="btn" style="text-decoration:none;color:#ffffff;padding:8px 16px;border-radius:4px;display:inline-block;">View Reply</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `Re: [${p.ticketNumber}] ${p.ticketTitle}`,
    html: shell(
      `Reply: ${p.ticketTitle}`,
      `${p.postedBy.name} posted a reply`,
      body,
    ),
  };
}

export function buildStatusUpdatedEmail(
  p: TicketStatusUpdatedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const prevColor =
    STATUS_COLOR[p.previousStatus.toLowerCase()] ?? COLORS.muted;
  const newColor = STATUS_COLOR[p.newStatus.toLowerCase()] ?? COLORS.muted;

  const body = `
    ${header('🔄 Ticket Status Updated', p.projectName)}
    <div class="body">
      <p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">${p.ticketNumber}</p>
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">${p.ticketTitle}</p>
      <div class="meta-row"><span class="meta-label">Updated By</span>${p.updatedBy.name}</div>
      <hr class="divider" />
      <p style="font-size:13px;color:${COLORS.muted};margin:0 0 10px;">Status Change</p>
      <div class="change-row">
        ${badge(p.previousStatus, prevColor)}
        <span class="change-arrow">→</span>
        ${badge(p.newStatus, newColor)}
      </div>
      <hr class="divider" />
      <a href="${appUrl}/tickets/${p.ticketId}" class="btn">View Ticket</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `[${p.ticketNumber}] Status changed to ${p.newStatus}`,
    html: shell(
      `Status Updated: ${p.ticketTitle}`,
      `Status changed to ${p.newStatus}`,
      body,
    ),
  };
}

export function buildPriorityUpdatedEmail(
  p: TicketPriorityUpdatedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const prevColor =
    PRIORITY_COLOR[p.previousPriority.toLowerCase()] ?? COLORS.muted;
  const newColor = PRIORITY_COLOR[p.newPriority.toLowerCase()] ?? COLORS.muted;

  const body = `
    ${header('⚡ Ticket Priority Updated', p.projectName)}
    <div class="body">
      <p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">${p.ticketNumber}</p>
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">${p.ticketTitle}</p>
      <div class="meta-row"><span class="meta-label">Updated By</span>${p.updatedBy.name}</div>
      <hr class="divider" />
      <p style="font-size:13px;color:${COLORS.muted};margin:0 0 10px;">Priority Change</p>
      <div class="change-row">
        ${badge(p.previousPriority, prevColor)}
        <span class="change-arrow">→</span>
        ${badge(p.newPriority, newColor)}
      </div>
      <hr class="divider" />
      <a href="${appUrl}/tickets/${p.ticketId}" class="btn">View Ticket</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `[${p.ticketNumber}] Priority changed to ${p.newPriority}`,
    html: shell(
      `Priority Updated: ${p.ticketTitle}`,
      `Priority changed to ${p.newPriority}`,
      body,
    ),
  };
}

export function buildAssigneeUpdatedEmail(
  p: TicketAssigneeUpdatedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const body = `
    ${header('👤 Ticket Reassigned', p.projectName)}
    <div class="body">
      <p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">${p.ticketNumber}</p>
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">${p.ticketTitle}</p>
      <div class="meta-row"><span class="meta-label">Updated By</span>${p.updatedBy.name}</div>
      <hr class="divider" />
      <div class="meta-row">
        <span class="meta-label">Previous</span>
        ${p.previousAssignee ? p.previousAssignee.name : '<em>Unassigned</em>'}
      </div>
      <div class="meta-row" style="font-weight:600;color:#111827;">
        <span class="meta-label">Now Assigned</span>
        ${p.newAssignee.name}
      </div>
      <hr class="divider" />
      <a href="${appUrl}/tickets/${p.ticketId}" class="btn">View Ticket</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `[${p.ticketNumber}] Ticket assigned to ${p.newAssignee.name}`,
    html: shell(
      `Reassigned: ${p.ticketTitle}`,
      `Now assigned to ${p.newAssignee.name}`,
      body,
    ),
  };
}

export function buildAttachmentAddedEmail(
  p: TicketAttachmentAddedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const body = `
    ${header('📎 Attachment Added', p.projectName)}
    <div class="body">
      <p style="margin:0 0 4px;font-size:13px;color:${COLORS.muted};">${p.ticketNumber}</p>
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">${p.ticketTitle}</p>
      <div class="meta-row"><span class="meta-label">Uploaded By</span>${p.uploadedBy.name}</div>
      <div class="meta-row"><span class="meta-label">File Name</span><strong>${p.fileName}</strong></div>
      <div class="meta-row"><span class="meta-label">File Size</span>${p.fileSize}</div>
      <hr class="divider" />
      <a href="${appUrl}/tickets/${p.ticketId}" class="btn">View Attachment</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `[${p.ticketNumber}] Attachment added: ${p.fileName}`,
    html: shell(
      `Attachment: ${p.ticketTitle}`,
      `${p.uploadedBy.name} added an attachment`,
      body,
    ),
  };
}

export function buildThreadMessageCreatedEmail(
  p: ThreadMessageCreatedPayload,
  appUrl: string,
  appName: string,
): { subject: string; html: string } {
  const body = `
    ${header('💬 New Thread Message', appName)}
    <div class="body">
      <p style="margin:0 0 18px;font-size:15px;color:#111827;font-weight:600;">New message in project</p>
      <div class="meta-row"><span class="meta-label">Posted By</span>${p.createdBy.name}</div>
      <hr class="divider" />
      <a href="${appUrl}/projects/${p.projectId}?t=1" class="btn" style="text-decoration:none;color:#ffffff;padding:8px 16px;border-radius:4px;display:inline-block;">View Message</a>
    </div>
    ${footer(appName, appUrl)}`;

  return {
    subject: `New thread message in project`,
    html: shell(
      `New Thread Message`,
      `${p.createdBy.name} posted a new message`,
      body,
    ),
  };
}
