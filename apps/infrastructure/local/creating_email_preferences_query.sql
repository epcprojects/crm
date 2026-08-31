BEGIN;

-- 1. Users we will process (not soft-deleted, invitation status doesn't matter)
CREATE TEMP TABLE tmp_target_users AS
SELECT id AS "userId"
FROM users
WHERE "isDeleted" IS NOT TRUE;

-- 2. Normalized, currently-true role claims per target user
CREATE TEMP TABLE tmp_user_claims AS
SELECT
  tu."userId",
  lower(trim(rc."claimType")) AS claim_type
FROM tmp_target_users tu
JOIN user_roles ur ON ur."userId" = tu."userId"
JOIN role_claims rc ON rc."roleId" = ur."roleId"
WHERE lower(trim(rc."claimValue")) = 'true';

-- 2b. Users holding the SUPER_ADMIN role — they get every notification type
--     unconditionally, regardless of what's in role_claims for that role.
CREATE TEMP TABLE tmp_super_admins AS
SELECT DISTINCT tu."userId"
FROM tmp_target_users tu
JOIN user_roles ur ON ur."userId" = tu."userId"
WHERE ur."roleId" = '00000000-0000-0000-0000-000000000001'; -- SUPER_ADMIN seed role

-- 3. Full permitted (userId, notificationType, entityType) set per user
CREATE TEMP TABLE tmp_permitted AS

-- SUPER_ADMIN: all notification types, no claim check
SELECT sa."userId",
       nt.notification_type::email_event_type_enum AS "notificationType",
       nt.entity_type::email_notification_entity_type_enum AS "entityType"
FROM tmp_super_admins sa
CROSS JOIN (VALUES
  ('project.assigned', 'project'),
  ('project.unassigned', 'project'),
  ('ticket.created', 'ticket'),
  ('ticket.reply_posted', 'ticket'),
  ('ticket.status_updated', 'ticket'),
  ('ticket.priority_updated', 'ticket'),
  ('ticket.assignee_updated', 'ticket'),
  ('ticket.due_date_updated', 'ticket'),
  ('ticket.mentioned_in_ticket_reply', 'ticket'),
  ('ticket.internal_message', 'ticket'),
  ('ticket.mentioned_in_ticket_internal_message', 'ticket'),
  ('thread.message_created', 'thread'),
  ('thread.reply_created', 'thread'),
  ('thread.mentioned_in_thread_message', 'thread'),
  ('thread.mentioned_in_thread_reply', 'thread')
) AS nt(notification_type, entity_type)

UNION

-- RELATED TO PROJECT VIEW PERMISSION
SELECT DISTINCT uc."userId",
       nt.notification_type::email_event_type_enum,
       nt.entity_type::email_notification_entity_type_enum
FROM tmp_user_claims uc
CROSS JOIN (VALUES
  ('project.assigned', 'project'),
  ('project.unassigned', 'project')
) AS nt(notification_type, entity_type)
WHERE uc.claim_type IN ('projects:view_list', 'projects.view_list')

UNION

-- RELATED TO TICKET VIEW PERMISSION
SELECT DISTINCT uc."userId",
       nt.notification_type::email_event_type_enum,
       nt.entity_type::email_notification_entity_type_enum
FROM tmp_user_claims uc
CROSS JOIN (VALUES
  ('ticket.created', 'ticket'),
  ('ticket.reply_posted', 'ticket'),
  ('ticket.status_updated', 'ticket'),
  ('ticket.priority_updated', 'ticket'),
  ('ticket.assignee_updated', 'ticket'),
  ('ticket.due_date_updated', 'ticket'),
  ('ticket.mentioned_in_ticket_reply', 'ticket')
) AS nt(notification_type, entity_type)
WHERE uc.claim_type IN ('tickets:view_list', 'tickets.view_list')

UNION

-- RELATED TO TICKET INTERNAL CHAT PERMISSION (subset of ticket module)
SELECT DISTINCT uc."userId",
       nt.notification_type::email_event_type_enum,
       nt.entity_type::email_notification_entity_type_enum
FROM tmp_user_claims uc
CROSS JOIN (VALUES
  ('ticket.internal_message', 'ticket'),
  ('ticket.mentioned_in_ticket_internal_message', 'ticket')
) AS nt(notification_type, entity_type)
WHERE uc.claim_type IN ('tickets:internal_chat', 'tickets.internal_chat')

UNION

-- RELATED TO THREAD VIEW PERMISSION
SELECT DISTINCT uc."userId",
       nt.notification_type::email_event_type_enum,
       nt.entity_type::email_notification_entity_type_enum
FROM tmp_user_claims uc
CROSS JOIN (VALUES
  ('thread.message_created', 'thread'),
  ('thread.reply_created', 'thread'),
  ('thread.mentioned_in_thread_message', 'thread'),
  ('thread.mentioned_in_thread_reply', 'thread')
) AS nt(notification_type, entity_type)
WHERE uc.claim_type IN ('thread:view', 'thread.view');

-- 4. Existing preference rows, restricted to target users
CREATE TEMP TABLE tmp_existing AS
SELECT enp.*
FROM email_notification_preferences enp
JOIN tmp_target_users tu ON tu."userId" = enp."userId";

-- PREVIEW A: rows that WOULD be inserted — run this SELECT alone and check it
SELECT p."userId", p."entityType", p."notificationType"
FROM tmp_permitted p
LEFT JOIN tmp_existing e
  ON e."userId" = p."userId" AND e."notificationType" = p."notificationType"
WHERE e.id IS NULL;

-- PREVIEW B: rows that WOULD be deleted
SELECT e.*
FROM tmp_existing e
LEFT JOIN tmp_permitted p
  ON p."userId" = e."userId" AND p."notificationType" = e."notificationType"
WHERE p."userId" IS NULL;

INSERT INTO email_notification_preferences ("userId", "entityType", "notificationType", "enabled", "createdAt", "updatedAt")
SELECT p."userId", p."entityType", p."notificationType", true, now(), now()
FROM tmp_permitted p
LEFT JOIN tmp_existing e
  ON e."userId" = p."userId" AND e."notificationType" = p."notificationType"
WHERE e.id IS NULL;

DELETE FROM email_notification_preferences
WHERE id IN (
  SELECT e.id
  FROM tmp_existing e
  LEFT JOIN tmp_permitted p
    ON p."userId" = e."userId" AND p."notificationType" = e."notificationType"
  WHERE p."userId" IS NULL
);

COMMIT;