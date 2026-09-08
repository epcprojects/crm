-- =============================================================================
-- cleanup_synthetic_tickets.sql
--
-- Removes ONLY the synthetic tickets created by seed_synthetic_tickets.sql.
-- Safe: targets rows by the 'SYNTH_TEST_BATCH' title marker only — will not
-- touch any real ticket data, regardless of how many times the seed script
-- has been run.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  to_delete integer;
BEGIN
  SELECT count(*) INTO to_delete FROM tickets WHERE title LIKE 'SYNTH_TEST_BATCH%';
  RAISE NOTICE 'About to delete % synthetic tickets.', to_delete;
END $$;

DELETE FROM tickets WHERE title LIKE 'SYNTH_TEST_BATCH%';

COMMIT;

ANALYZE tickets;