-- =============================================================================
-- create_tickets.sql
--
-- Generates realistic-looking synthetic tickets. Titles are built from random
-- verb/noun phrases (e.g. "Fix login timeout", "Update billing report") with
-- a fixed marker token embedded as its own word — titles look varied and
-- real, but every one contains the same marker, making them reliably
-- identifiable and deletable via delete_tickets.sql.
--
-- Pulls REAL projects, REAL project members, REAL status keys and REAL
-- priority keys dynamically — no hardcoded IDs. Distributes tickets evenly
-- (round-robin) across all real projects. reporterId/assigneeId are drawn
-- only from actual members of each ticket's project. ticketType is randomly
-- bug / feature_request / null.
--
-- ~2% of rows additionally get "bug"/"description" content seeded into the
-- title+description (independent of the marker) so search/index testing has
-- real matches to find — this is separate from the deletion marker, both
-- are present on those rows.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  rows_to_insert integer := 50000;                -- <<< EDIT: how many tickets
  created_by_user uuid := '00000000-0000-0000-0000-000000000002';  -- <<< EDIT
  marker text := 'T7K';  -- fixed marker embedded in every generated ticket title
BEGIN
  -- Step 1: real project-membership pairs
  DROP TABLE IF EXISTS tmp_project_members;
  CREATE TEMP TABLE tmp_project_members AS
  SELECT p.id AS project_id, u.id AS member_id
  FROM projects p
  JOIN user_projects_join upj ON upj."projectsId" = p.id
  JOIN users u ON u.id = upj."usersId" AND u."deletedAt" IS NULL
  WHERE p."deletedAt" IS NULL;

  IF (SELECT count(*) FROM tmp_project_members) = 0 THEN
    RAISE EXCEPTION 'No project/member pairs found — check projects and user_projects_join tables.';
  END IF;

  DROP TABLE IF EXISTS tmp_projects_arr;
  CREATE TEMP TABLE tmp_projects_arr AS
  SELECT array_agg(DISTINCT project_id) AS project_ids FROM tmp_project_members;

  DROP TABLE IF EXISTS tmp_members_by_project;
  CREATE TEMP TABLE tmp_members_by_project AS
  SELECT project_id, array_agg(DISTINCT member_id) AS member_ids
  FROM tmp_project_members
  GROUP BY project_id;

  -- Step 2: real status/priority keys
  DROP TABLE IF EXISTS tmp_status_arr;
  CREATE TEMP TABLE tmp_status_arr AS
  SELECT array_agg(key) AS status_keys FROM ticket_statuses WHERE "deletedAt" IS NULL;

  DROP TABLE IF EXISTS tmp_priority_arr;
  CREATE TEMP TABLE tmp_priority_arr AS
  SELECT array_agg(key) AS priority_keys FROM ticket_priorities WHERE "deletedAt" IS NULL;

  IF (SELECT status_keys FROM tmp_status_arr) IS NULL THEN
    RAISE EXCEPTION 'No ticket_statuses found.';
  END IF;
  IF (SELECT priority_keys FROM tmp_priority_arr) IS NULL THEN
    RAISE EXCEPTION 'No ticket_priorities found.';
  END IF;

  -- Step 3: word lists for realistic titles, as temp table (used in main insert below)
  DROP TABLE IF EXISTS tmp_title_words;
  CREATE TEMP TABLE tmp_title_words AS
SELECT
    ARRAY[
        'Fix',
        'Update',
        'Investigate',
        'Resolve',
        'Review',
        'Improve',
        'Add',
        'Remove',
        'Refactor',
        'Debug',
        'Optimize',
        'Test',
        'Verify',
        'Document',
        'Configure',
        'Implement',
        'Restore',
        'Migrate',
        'Replace',
        'Enable',
        'Disable',
        'Adjust',
        'Correct',
        'Monitor',
        'Audit',
        'Validate',
        'Upgrade',
        'Deploy',
        'Reproduce',
        'Troubleshoot'
    ]::text[] AS verbs,
 ARRAY[
    'Users are unable to log in after password reset',
    'Investigate intermittent login failures',
    'Fix session expiration occurring unexpectedly',
    'Users are not receiving password reset emails',
    'Resolve account activation email delivery issue',

    'Fix incorrect permissions for Project Manager role',
    'Investigate users losing access to assigned projects',
    'Update role permissions for ticket management',
    'Users can access projects they are not assigned to',
    'Review authorization checks for project endpoints',

    'Fix ticket creation failing for some users',
    'Investigate duplicate tickets being created',
    'Ticket assignment notification is not being delivered',
    'Fix incorrect ticket status after reassignment',
    'Update ticket priority validation',
    'Users are unable to add attachments to tickets',
    'Uploaded attachments are missing from ticket threads',
    'Fix ticket comments not appearing in real time',
    'Investigate missing activity logs for ticket updates',
    'Resolve incorrect ticket assignee displayed in dashboard',

    'Project members are not receiving notifications',
    'Fix project assignment notification delivery',
    'Investigate duplicate notifications',
    'Update notification preferences handling',
    'Users continue receiving disabled email notifications',
    'Fix notifications appearing for unrelated projects',
    'Investigate delayed real-time notifications',

    'Email notifications are failing intermittently',
    'Fix incorrect email template formatting',
    'Investigate emails being sent to inactive users',
    'Update notification email content',
    'Resolve failed email delivery for ticket updates',

    'Dashboard statistics are not updating',
    'Fix incorrect ticket counts on dashboard',
    'Investigate slow dashboard loading times',
    'Update dashboard filtering behavior',
    'Fix pagination on dashboard results',

    'Export fails when generating large reports',
    'Fix incorrect data in exported reports',
    'Investigate report generation timeout',
    'Update report filtering logic',
    'Users are unable to download generated reports',

    'File uploads fail for large attachments',
    'Investigate intermittent file upload failures',
    'Fix uploaded files not appearing in ticket threads',
    'Resolve attachment download errors',
    'Update attachment validation rules',

    'Investigate intermittent WebSocket disconnections',
    'Fix real-time updates not appearing for users',
    'Users are not receiving live ticket updates',
    'Resolve WebSocket connection failures',
    'Improve real-time notification reliability',

    'Investigate slow API responses',
    'Optimize project listing API',
    'Optimize ticket search queries',
    'Fix API timeout when loading large datasets',
    'Review database queries used by dashboard',
    'Investigate duplicate API requests',

    'Fix search returning incomplete results',
    'Update ticket search filters',
    'Investigate incorrect search results',
    'Improve project search performance',
    'Fix pagination returning duplicate records',

    'Investigate stale project data',
    'Fix incorrect project member information',
    'Resolve missing records after data migration',
    'Review database migration results',
    'Fix database connection failures',

    'Update environment configuration',
    'Review production environment variables',
    'Configure email notification settings',
    'Update API integration configuration',
    'Review error handling for external services',

    'Investigate integration failures with external services',
    'Fix webhook events not being processed',
    'Resolve failed API integration requests',
    'Verify webhook payload validation',
    'Improve handling of third-party API failures'
]::text[] AS nouns;
    -- ARRAY[
    --     'login',
    --     'billing',
    --     'dashboard',
    --     'report',
    --     'notification',
    --     'export',
    --     'import',
    --     'sync',
    --     'upload',
    --     'search',
    --     'timeout',
    --     'permission',
    --     'integration',
    --     'layout',
    --     'session',
    --     'authentication',
    --     'authorization',
    --     'password reset',
    --     'email delivery',
    --     'user registration',
    --     'account activation',
    --     'profile settings',
    --     'role assignment',
    --     'project access',
    --     'ticket creation',
    --     'ticket assignment',
    --     'ticket status',
    --     'ticket priority',
    --     'ticket comments',
    --     'ticket attachments',
    --     'file upload',
    --     'file download',
    --     'data validation',
    --     'API response',
    --     'API integration',
    --     'database connection',
    --     'database query',
    --     'data migration',
    --     'background job',
    --     'scheduled task',
    --     'webhook',
    --     'WebSocket connection',
    --     'real-time updates',
    --     'notification preferences',
    --     'email template',
    --     'activity log',
    --     'audit trail',
    --     'search filters',
    --     'pagination',
    --     'sorting',
    --     'mobile layout',
    --     'responsive design',
    --     'performance',
    --     'error handling',
    --     'duplicate records',
    --     'missing records',
    --     'stale data',
    --     'cache invalidation',
    --     'server configuration',
    --     'environment variables'
    -- ]::text[] AS nouns;

	
  -- Step 4: insert tickets
  INSERT INTO tickets (
    id, "projectId", "ticketRefNo", title, description,
    "statusKey", "priorityKey", "reporterId", "assigneeId", "createdBy",
    "ticketType", "createdAt", "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    proj_id,
    'HH-' || LPAD(seq_val::text, GREATEST(3, length(seq_val::text)), '0'),

    CASE
      WHEN s % 50 = 0 THEN
        (tw.verbs[1 + floor(random() * array_length(tw.verbs, 1))])
        || ' ' || marker || ' '
        || (tw.nouns[1 + floor(random() * array_length(tw.nouns, 1))])
        || ' — bug: description issue'
      ELSE
        (tw.verbs[1 + floor(random() * array_length(tw.verbs, 1))])
        || ' ' || marker || ' '
        || (tw.nouns[1 + floor(random() * array_length(tw.nouns, 1))])
    END,

    CASE
      WHEN s % 50 = 0 THEN
        repeat('User reported a bug while using the system. Description of the issue follows. ' || md5(random()::text) || ' ', (random() * 15 + 1)::int)
      ELSE
        repeat(md5(random()::text) || ' ' || md5(random()::text) || ' ', (random() * 15 + 1)::int)
    END,

    status_keys[1 + floor(random() * array_length(status_keys, 1))],
    priority_keys[1 + floor(random() * array_length(priority_keys, 1))],
    members[1 + floor(random() * array_length(members, 1))],
    CASE WHEN random() < 0.7
         THEN members[1 + floor(random() * array_length(members, 1))]
         ELSE NULL END,
    created_by_user,
    (ARRAY['bug', 'feature_request', NULL])[1 + floor(random() * 3)]::tickets_tickettype_enum,
    now() - (random() * interval '180 days'),
    now()
  FROM (
    SELECT
      s,
      nextval('ticket_number_seq') AS seq_val,
      (SELECT project_ids FROM tmp_projects_arr)[
        1 + (s % (SELECT array_length(project_ids, 1) FROM tmp_projects_arr))
      ] AS proj_id
    FROM generate_series(1, rows_to_insert) AS s
  ) sub
  JOIN tmp_members_by_project mbp ON mbp.project_id = sub.proj_id
  CROSS JOIN LATERAL (SELECT mbp.member_ids AS members) m
  CROSS JOIN (SELECT status_keys FROM tmp_status_arr) st
  CROSS JOIN (SELECT priority_keys FROM tmp_priority_arr) pri
  CROSS JOIN tmp_title_words tw;

  RAISE NOTICE 'Inserted % synthetic tickets, each containing marker "%".', rows_to_insert, marker;
END $$;

COMMIT;

ANALYZE tickets;

-- Sanity check: distribution across projects
SELECT p.name, p.id, count(t.id) AS ticket_count
FROM tickets t
JOIN projects p ON p.id = t."projectId"
WHERE t.title LIKE '%T7K%'
GROUP BY p.name, p.id
ORDER BY ticket_count DESC;
