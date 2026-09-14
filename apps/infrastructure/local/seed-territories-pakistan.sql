-- Seed Pakistan territories (provinces, then their cities via parentId)
-- Idempotent: safe to re-run, rows are matched and updated by fixed id.

BEGIN;

-- 1) Provinces / top-level territories (parentId is NULL)
INSERT INTO territories ("id", "name", "type", "parentId", "createdAt", "updatedAt")
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Punjab', 'province', NULL, NOW(), NOW()),
  ('a1000000-0000-4000-8000-000000000002', 'Sindh', 'province', NULL, NOW(), NOW()),
  ('a1000000-0000-4000-8000-000000000003', 'Khyber Pakhtunkhwa', 'province', NULL, NOW(), NOW()),
  ('a1000000-0000-4000-8000-000000000004', 'Balochistan', 'province', NULL, NOW(), NOW()),
  ('a1000000-0000-4000-8000-000000000005', 'Islamabad Capital Territory', 'province', NULL, NOW(), NOW()),
  ('a1000000-0000-4000-8000-000000000006', 'Azad Jammu & Kashmir', 'province', NULL, NOW(), NOW()),
  ('a1000000-0000-4000-8000-000000000007', 'Gilgit-Baltistan', 'province', NULL, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "parentId" = EXCLUDED."parentId",
  "updatedAt" = EXCLUDED."updatedAt";

-- 2) Cities, each referencing its province via parentId
INSERT INTO territories ("id", "name", "type", "parentId", "createdAt", "updatedAt")
VALUES
  -- Punjab
  ('a2000000-0000-4000-8000-000000000001', 'Lahore', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000002', 'Faisalabad', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000003', 'Rawalpindi', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000004', 'Multan', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000005', 'Gujranwala', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000006', 'Sialkot', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000007', 'Bahawalpur', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000008', 'Sargodha', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000009', 'Sheikhupura', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000010', 'Gujrat', 'city', 'a1000000-0000-4000-8000-000000000001', NOW(), NOW()),

  -- Sindh
  ('a2000000-0000-4000-8000-000000000011', 'Karachi', 'city', 'a1000000-0000-4000-8000-000000000002', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000012', 'Hyderabad', 'city', 'a1000000-0000-4000-8000-000000000002', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000013', 'Sukkur', 'city', 'a1000000-0000-4000-8000-000000000002', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000014', 'Larkana', 'city', 'a1000000-0000-4000-8000-000000000002', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000015', 'Mirpur Khas', 'city', 'a1000000-0000-4000-8000-000000000002', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000016', 'Nawabshah', 'city', 'a1000000-0000-4000-8000-000000000002', NOW(), NOW()),

  -- Khyber Pakhtunkhwa
  ('a2000000-0000-4000-8000-000000000017', 'Peshawar', 'city', 'a1000000-0000-4000-8000-000000000003', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000018', 'Abbottabad', 'city', 'a1000000-0000-4000-8000-000000000003', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000019', 'Mardan', 'city', 'a1000000-0000-4000-8000-000000000003', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000020', 'Mingora (Swat)', 'city', 'a1000000-0000-4000-8000-000000000003', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000021', 'Kohat', 'city', 'a1000000-0000-4000-8000-000000000003', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000022', 'Dera Ismail Khan', 'city', 'a1000000-0000-4000-8000-000000000003', NOW(), NOW()),

  -- Balochistan
  ('a2000000-0000-4000-8000-000000000023', 'Quetta', 'city', 'a1000000-0000-4000-8000-000000000004', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000024', 'Gwadar', 'city', 'a1000000-0000-4000-8000-000000000004', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000025', 'Turbat', 'city', 'a1000000-0000-4000-8000-000000000004', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000026', 'Sibi', 'city', 'a1000000-0000-4000-8000-000000000004', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000027', 'Khuzdar', 'city', 'a1000000-0000-4000-8000-000000000004', NOW(), NOW()),

  -- Islamabad Capital Territory
  ('a2000000-0000-4000-8000-000000000028', 'Islamabad', 'city', 'a1000000-0000-4000-8000-000000000005', NOW(), NOW()),

  -- Azad Jammu & Kashmir
  ('a2000000-0000-4000-8000-000000000029', 'Muzaffarabad', 'city', 'a1000000-0000-4000-8000-000000000006', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000030', 'Mirpur', 'city', 'a1000000-0000-4000-8000-000000000006', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000031', 'Rawalakot', 'city', 'a1000000-0000-4000-8000-000000000006', NOW(), NOW()),

  -- Gilgit-Baltistan
  ('a2000000-0000-4000-8000-000000000032', 'Gilgit', 'city', 'a1000000-0000-4000-8000-000000000007', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000033', 'Skardu', 'city', 'a1000000-0000-4000-8000-000000000007', NOW(), NOW()),
  ('a2000000-0000-4000-8000-000000000034', 'Hunza', 'city', 'a1000000-0000-4000-8000-000000000007', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "parentId" = EXCLUDED."parentId",
  "updatedAt" = EXCLUDED."updatedAt";

COMMIT;

-- Run this script with psql or via Docker (after the app has synced the `territories` table at least once):
-- psql "postgresql://postgres:postgres@localhost:5432/harperhelp" -f apps/infrastructure/local/seed-territories-pakistan.sql
-- docker exec -i harperhelp_postgres psql -U postgres -d harperhelp < apps/infrastructure/local/seed-territories-pakistan.sql
