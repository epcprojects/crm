-- =============================================================================
-- seed_synthetic_tickets.sql
--
-- Generates realistic synthetic ticket data for load/index testing on staging.
-- Pulls REAL projects, REAL project members, REAL status keys and REAL
-- priority keys dynamically from the current database — no hardcoded IDs,
-- safe to run on any environment (local, staging) as-is.
--
-- WHAT IT DOES:
--   1. Builds temp tables of real (projectId, memberId) pairs, distinct
--      project IDs, and per-project member arrays.
--   2. Inserts N tickets, round-robin distributed evenly across all real
--      projects (deterministic, not random — guarantees even spread and
--      avoids the "LATERAL silently flattens to one value" bug).
--   3. reporterId / assigneeId are drawn ONLY from users who are actual
--      members of that specific ticket's project (respects real
--      user_projects_join data, so membership-filtered routes behave
--      correctly against this data).
--   4. statusKey / priorityKey are drawn from real ticket_statuses /
--      ticket_priorities rows that exist right now.
--   5. Seeds ~2% of rows with the word "bug" and "description" so search
--      testing has real matches to find.
--
-- USAGE:
--   1. Adjust :rows_to_insert and :created_by below.
--   2. Run this whole file against staging.
--   3. Run ANALYZE tickets; afterward (included at the end).
--   4. Use cleanup_synthetic_tickets.sql to remove this batch when done.
--
-- SAFE TO RE-RUN: each run is tagged with a unique batch marker in the
-- title/description so cleanup can target exactly this batch and nothing
-- pre-existing.
-- =============================================================================

\set rows_to_insert 5000
\set created_by '00000000-0000-0000-0000-000000000002'

-- Unique tag for this run, so cleanup only removes rows THIS script created.
-- Change this per run if you want to keep multiple batches distinguishable.
\set batch_tag 'SYNTH_TEST_BATCH'

BEGIN;

-- -----------------------------------------------------------------------
-- Step 1: Pull real project-membership pairs (respects actual access rules)
-- -----------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_project_members;
CREATE TEMP TABLE tmp_project_members AS
SELECT p.id AS project_id, u.id AS member_id
FROM projects p
JOIN user_projects_join upj ON upj."projectsId" = p.id
JOIN users u ON u.id = upj."usersId" AND u."deletedAt" IS NULL
WHERE p."deletedAt" IS NULL;

-- Sanity guard: fail loudly rather than silently inserting garbage
-- if staging has no projects/members at all.
DO $$
BEGIN
  IF (SELECT count(*) FROM tmp_project_members) = 0 THEN
    RAISE EXCEPTION 'No project/member pairs found — check projects and user_projects_join tables before proceeding.';
  END IF;
END $$;

DROP TABLE IF EXISTS tmp_projects_arr;
CREATE TEMP TABLE tmp_projects_arr AS
SELECT array_agg(DISTINCT project_id) AS project_ids FROM tmp_project_members;

DROP TABLE IF EXISTS tmp_members_by_project;
CREATE TEMP TABLE tmp_members_by_project AS
SELECT project_id, array_agg(DISTINCT member_id) AS member_ids
FROM tmp_project_members
GROUP BY project_id;

-- -----------------------------------------------------------------------
-- Step 2: Pull real status keys and priority keys
-- -----------------------------------------------------------------------
DROP TABLE IF EXISTS tmp_status_arr;
CREATE TEMP TABLE tmp_status_arr AS
SELECT array_agg(key) AS status_keys
FROM ticket_statuses
WHERE "deletedAt" IS NULL;

DROP TABLE IF EXISTS tmp_priority_arr;
CREATE TEMP TABLE tmp_priority_arr AS
SELECT array_agg(key) AS priority_keys
FROM ticket_priorities
WHERE "deletedAt" IS NULL;

DO $$
BEGIN
  IF (SELECT status_keys FROM tmp_status_arr) IS NULL THEN
    RAISE EXCEPTION 'No ticket_statuses found — cannot generate valid statusKey values.';
  END IF;
  IF (SELECT priority_keys FROM tmp_priority_arr) IS NULL THEN
    RAISE EXCEPTION 'No ticket_priorities found — cannot generate valid priorityKey values.';
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- Step 3: Insert synthetic tickets
-- -----------------------------------------------------------------------
INSERT INTO tickets (
  id, "projectId", "ticketRefNo", title, description,
  "statusKey", "priorityKey", "reporterId", "assigneeId", "createdBy",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  proj_id,
  'HH-' || LPAD(seq_val::text, GREATEST(3, length(seq_val::text)), '0'),

  CASE
    WHEN s % 50 = 0 THEN :'batch_tag' || ' Bug: application crashes on ' || md5(random()::text)
    ELSE :'batch_tag' || ' ' || initcap(md5(random()::text)) || ' ' || initcap(md5((random()*2)::text))
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
  :'created_by',
  now() - (random() * interval '180 days'),
  now()
FROM (
  SELECT
    s,
    nextval('ticket_number_seq') AS seq_val,
    -- Deterministic round-robin across real project IDs (not random —
    -- guarantees even distribution, avoids planner-flattening issues).
    (SELECT project_ids FROM tmp_projects_arr)[
      1 + (s % (SELECT array_length(project_ids, 1) FROM tmp_projects_arr))
    ] AS proj_id
  FROM generate_series(1, :rows_to_insert) AS s
) sub
JOIN tmp_members_by_project mbp ON mbp.project_id = sub.proj_id
CROSS JOIN LATERAL (SELECT mbp.member_ids AS members) m
CROSS JOIN (SELECT status_keys FROM tmp_status_arr) st
CROSS JOIN (SELECT priority_keys FROM tmp_priority_arr) pri;

-- -----------------------------------------------------------------------
-- Step 4: Report what was inserted
-- -----------------------------------------------------------------------
DO $$
DECLARE
  batch_count integer;
BEGIN
  SELECT count(*) INTO batch_count FROM tickets WHERE title LIKE 'SYNTH_TEST_BATCH%';
  RAISE NOTICE 'Inserted % synthetic tickets tagged with batch marker.', batch_count;
END $$;

COMMIT;

-- -----------------------------------------------------------------------
-- Step 5: Refresh planner statistics — REQUIRED before benchmarking
-- -----------------------------------------------------------------------
ANALYZE tickets;

-- -----------------------------------------------------------------------
-- Step 6: Sanity check — confirm even distribution across real projects
-- -----------------------------------------------------------------------
SELECT p.name, p.id, count(t.id) AS ticket_count
FROM tickets t
JOIN projects p ON p.id = t."projectId"
WHERE t.title LIKE 'SYNTH_TEST_BATCH%'
GROUP BY p.name, p.id
ORDER BY ticket_count DESC;