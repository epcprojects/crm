-- =============================================================================
-- delete_tickets.sql
--
-- Removes ONLY the synthetic tickets created by create_tickets.sql, matched
-- by the fixed marker token 'ZQXT7K' embedded in their title — safe against
-- real ticket data, since real titles will never contain this exact token.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  marker text := 'T7K';
  to_delete integer;
BEGIN
  SELECT count(*) INTO to_delete FROM tickets WHERE title LIKE '%' || marker || '%';
  RAISE NOTICE 'About to delete % synthetic tickets.', to_delete;
END $$;

DELETE FROM tickets WHERE title LIKE '%T7K%';

COMMIT;

ANALYZE tickets;
