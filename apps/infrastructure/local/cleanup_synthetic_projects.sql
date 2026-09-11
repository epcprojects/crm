-- =============================================================================
-- cleanup_synthetic_projects.sql
--
-- Removes ONLY the synthetic projects created by seed_synthetic_projects.sql,
-- and their user_projects_join membership rows. Safe: targets rows by the
-- 'SYNTH_TEST_BATCH' name marker only — will not touch real project data.
--
-- NOTE: if you also seeded synthetic tickets under these projects, delete
-- those FIRST (see cleanup_synthetic_tickets.sql) — tickets."projectId" has
-- onDelete: CASCADE per the entity, so deleting a project would cascade-
-- delete its tickets automatically, but it's cleaner/safer to remove
-- tickets explicitly first if you want to keep the two cleanups independent.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  to_delete integer;
BEGIN
  SELECT count(*) INTO to_delete FROM projects WHERE name LIKE 'SYNTH_TEST_BATCH%';
  RAISE NOTICE 'About to delete % synthetic projects (and their memberships).', to_delete;
END $$;

DELETE FROM user_projects_join
WHERE "projectsId" IN (SELECT id FROM projects WHERE name LIKE 'SYNTH_TEST_BATCH%');

DELETE FROM projects WHERE name LIKE 'SYNTH_TEST_BATCH%';

COMMIT;

ANALYZE projects;
ANALYZE user_projects_join;
