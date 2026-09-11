-- =============================================================================
-- seed_synthetic_projects.sql
--
-- Generates synthetic projects for testing, mirroring createProject()'s logic:
--   - projectCode = 'HH' || nextval('project_code_seq')
--   - logoLetter  = lowercase of first 2 letters of the project name
--   - members     = creating user + all Super Admins (role id
--                    '00000000-0000-0000-0000-000000000001'), same as the
--                    real service's member-seeding step
--
-- Every project name is prefixed with 'SYNTH_TEST_BATCH' so
-- cleanup_synthetic_projects.sql can remove exactly this batch and nothing
-- else — safe to run against a DB that already has real projects.
--
-- All generated projects are created ACTIVE (isActive = true, deletedAt =
-- NULL). Adjust the loop count and createdBy below before running.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  projects_to_create integer := 1;             -- <<< EDIT: how many projects to create
  created_by_user uuid := '00000000-0000-0000-0000-000000000002';  -- <<< EDIT: creating user ID
  super_admin_role_id uuid := '00000000-0000-0000-0000-000000000001';

  i integer;
  new_project_id uuid;
  new_seq bigint;
  new_code text;
  new_name text;
  new_logo_letter text;
  member_ids uuid[];
BEGIN
  -- Guard: fail loudly if there are no super admins to attach, rather than
  -- silently creating member-less projects.
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur."roleId" = super_admin_role_id
  ) THEN
    RAISE EXCEPTION 'No users found with the Super Admin role — check user_roles table.';
  END IF;

  FOR i IN 1..projects_to_create LOOP
    new_project_id := gen_random_uuid();

    -- Pull the next value from the real sequence, same as the service does.
    SELECT nextval('project_code_seq') INTO new_seq;
    new_code := 'HH' || new_seq;

    new_name := 'SYNTH_TEST_BATCH Project ' || md5(random()::text);
    new_logo_letter := lower(substring(new_name from 18 for 2)); -- first 2 chars after the tag prefix

    INSERT INTO projects (
      id, name, category, "projectCode", "brandColor", "logoLetter",
      "isActive", "createdBy", "createdAt", "updatedAt"
    ) VALUES (
      new_project_id,
      new_name,
      (ARRAY['tech', 'financial', 'health', 'ai', 'software', 'research'])[1 + floor(random() * 6)],
      new_code,
      (ARRAY['#5B4FCF', '#17B26A', '#F04438', '#F79009', '#667085', '#0BA5EC', '#D444F1', '#6172F3'])[1 + floor(random() * 8)],
      new_logo_letter,
      true,
      created_by_user,
      now() - (random() * interval '90 days'),
      now()
    );

    -- Build member list: creating user + all super admins, deduplicated
    -- (mirrors the Set<string> dedup in createProject()).
    SELECT array_agg(DISTINCT member) INTO member_ids
    FROM (
      SELECT created_by_user AS member
      UNION
      SELECT ur."userId" FROM user_roles ur WHERE ur."roleId" = super_admin_role_id
    ) m;

    INSERT INTO user_projects_join ("projectsId", "usersId")
    SELECT new_project_id, unnest(member_ids);
  END LOOP;

  RAISE NOTICE 'Created % synthetic projects with members attached.', projects_to_create;
END $$;

COMMIT;

ANALYZE projects;
ANALYZE user_projects_join;

-- Sanity check
SELECT id, name, "projectCode", "logoLetter",
       (SELECT count(*) FROM user_projects_join upj WHERE upj."projectsId" = p.id) AS member_count
FROM projects p
WHERE name LIKE 'SYNTH_TEST_BATCH%'
ORDER BY "createdAt" DESC;
