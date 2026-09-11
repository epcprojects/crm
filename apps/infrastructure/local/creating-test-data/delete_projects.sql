-- =============================================================================
-- delete_projects.sql
--
-- Removes ONLY the synthetic projects created by create_projects.sql, matched
-- by the fixed marker token 'ZQXP9M' embedded in their name — safe against
-- real project data, since real names will never contain this exact token.
--
-- NOTE: run delete_tickets.sql FIRST if you also seeded synthetic tickets
-- under these projects. tickets."projectId" has onDelete: CASCADE, so
-- deleting a project here WILL cascade-delete its tickets automatically —
-- but deleting tickets explicitly first keeps the two cleanups independent
-- and avoids relying on cascade behavior silently doing extra work.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  marker text := 'ZQXP9M';
  to_delete integer;
BEGIN
  SELECT count(*) INTO to_delete FROM projects WHERE name LIKE '%' || marker || '%';
  RAISE NOTICE 'About to delete % synthetic projects (and their memberships).', to_delete;
END $$;

DELETE FROM user_projects_join
WHERE "projectsId" IN (SELECT id FROM projects WHERE name LIKE '%ZQXP9M%');

DELETE FROM projects WHERE name LIKE '%ZQXP9M%';

COMMIT;

ANALYZE projects;
ANALYZE user_projects_join;
