-- =============================================================================
-- create_projects.sql
--
-- Generates realistic-looking synthetic projects. Each name is built from a
-- random adjective + noun pair (e.g. "Crimson Falcon", "Silent Harbor") with
-- a fixed marker token embedded in a consistent spot — names look varied and
-- real, but every single one contains the exact same marker, making them
-- reliably identifiable and deletable as a batch via delete_projects.sql,
-- with zero risk of matching real project names.
--
-- Mirrors createProject()'s real logic:
--   - projectCode = 'HH' || nextval('project_code_seq')
--   - logoLetter  = lowercase of first 2 letters of the generated name
--   - members     = creating user + all Super Admins (role id
--                    '00000000-0000-0000-0000-000000000001')
--
-- All generated projects are ACTIVE (isActive = true, deletedAt = NULL).
-- =============================================================================

BEGIN;

DO $$
DECLARE
  projects_to_create integer := 1;             -- <<< EDIT: how many to create
  created_by_user uuid := '00000000-0000-0000-0000-000000000002';  -- <<< EDIT
  super_admin_role_id uuid := '00000000-0000-0000-0000-000000000001';
  marker text := 'P9M';  -- fixed marker embedded in every generated project name

  adjectives text[] := ARRAY['Crimson','Silent','Golden','Rapid','Hidden','Azure','Noble','Swift','Quiet','Bold',
                              'Bright','Ancient','Vivid','Steady','Lively','Distant','Calm','Sharp','Fresh','Grand'];
  nouns text[]      := ARRAY['Falcon','Harbor','Summit','River','Beacon','Forge','Orbit','Meadow','Anchor','Comet',
                              'Bridge','Canyon','Lantern','Voyage','Garden','Ridge','Current','Horizon','Pioneer','Compass'];

  i integer;
  new_project_id uuid;
  new_seq bigint;
  new_code text;
  new_name text;
  new_logo_letter text;
  member_ids uuid[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur."roleId" = super_admin_role_id
  ) THEN
    RAISE EXCEPTION 'No users found with the Super Admin role — check user_roles table.';
  END IF;

  FOR i IN 1..projects_to_create LOOP
    new_project_id := gen_random_uuid();

    SELECT nextval('project_code_seq') INTO new_seq;
    new_code := 'HH' || new_seq;

    -- Realistic-looking name with the marker embedded as its own token.
    new_name := (adjectives[1 + floor(random() * array_length(adjectives, 1))])
             || ' ' || marker || ' '
             || (nouns[1 + floor(random() * array_length(nouns, 1))]);

    new_logo_letter := lower(substring(new_name from 1 for 2));

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

    SELECT array_agg(DISTINCT member) INTO member_ids
    FROM (
      SELECT created_by_user AS member
      UNION
      SELECT ur."userId" FROM user_roles ur WHERE ur."roleId" = super_admin_role_id
    ) m;

    INSERT INTO user_projects_join ("projectsId", "usersId")
    SELECT new_project_id, unnest(member_ids);
  END LOOP;

  RAISE NOTICE 'Created % synthetic projects, each containing marker "%".', projects_to_create, marker;
END $$;

COMMIT;

ANALYZE projects;
ANALYZE user_projects_join;

-- Sanity check
SELECT id, name, "projectCode", "logoLetter",
       (SELECT count(*) FROM user_projects_join upj WHERE upj."projectsId" = p.id) AS member_count
FROM projects p
WHERE name LIKE '%ZQXP9M%'
ORDER BY "createdAt" DESC;
