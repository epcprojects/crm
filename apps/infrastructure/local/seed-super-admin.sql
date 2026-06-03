-- Seed initial auth data for HarperHelp
-- 1) insert roles first
-- 2) insert the first super admin user
-- 3) assign the super admin role via user_roles

BEGIN;

-- Ensure all system roles exist
WITH role_rows AS (
  SELECT * FROM (VALUES
    (uuid '00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'SUPER_ADMIN', 'Super administrator with full system privileges'),
    (uuid '00000000-0000-0000-0000-000000000004', 'ADMIN', 'ADMIN', 'Administrator with full project and user management permissions'),
    (uuid '00000000-0000-0000-0000-000000000005', 'PROJECT_MANAGER', 'PROJECT_MANAGER', 'Project manager with access to project resources'),
    (uuid '00000000-0000-0000-0000-000000000006', 'DEVELOPER', 'DEVELOPER', 'Developer with access to assigned project tasks'),
    (uuid '00000000-0000-0000-0000-000000000007', 'VIEWER', 'VIEWER', 'Read-only access to project data')
  ) AS t ("id", "name", "normalizedName", "description")
), seeded_role AS (
  INSERT INTO roles ("id", "name", "normalizedName", "description", "createdAt", "updatedAt")
  SELECT
    "id",
    "name",
    "normalizedName",
    "description",
    NOW(),
    NOW()
  FROM role_rows
  ON CONFLICT ("normalizedName") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "updatedAt" = EXCLUDED."updatedAt"
  RETURNING "id"
)

-- Ensure the seed user exists
, seeded_user AS (
  INSERT INTO users (
    "id",
    "email",
    "normalizedEmail",
    "passwordHash",
    "fullName",
    "normalizedFullName",
    "isInvitationAccepted",
    "isDeleted",
    "isActive",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    '00000000-0000-0000-0000-000000000002',
    'superadmin@harperhelp.local',
    'SUPERADMIN@HARPERHELP.LOCAL',
    '$2b$10$muSm2nhOx3dJ/Ex2LrQAHuxkprGunZ.xyt8jKNog14XHDH4FlNd0a',
    'Super Admin',
    'SUPER ADMIN',
    TRUE,
    FALSE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT ("normalizedEmail") DO UPDATE
  SET
    "passwordHash" = EXCLUDED."passwordHash",
    "fullName" = EXCLUDED."fullName",
    "normalizedFullName" = EXCLUDED."normalizedFullName",
    "isInvitationAccepted" = EXCLUDED."isInvitationAccepted",
    "isDeleted" = EXCLUDED."isDeleted",
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = EXCLUDED."updatedAt"
  RETURNING "id"
)

-- Assign the SUPER_ADMIN role to the seed user
INSERT INTO user_roles ("userId", "roleId", "assignedBy", "assignedAt", "createdAt")
SELECT
  u."id",
  r."id",
  NULL,
  NOW(),
  NOW()
FROM seeded_user u
CROSS JOIN seeded_role r
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur."userId" = u."id" AND ur."roleId" = r."id"
);

COMMIT;

-- Run this script with psql or via Docker:
-- psql "postgresql://postgres:postgres@localhost:5432/harperhelp" -f apps/infrastructure/local/seed-super-admin.sql
-- docker exec -i harperhelp_postgres psql -U postgres -d harperhelp < apps/infrastructure/local/seed-super-admin.sql
