-- Flag the statuses whose leads should NOT count as "Active".
-- The "isClosed" column is added automatically (default false) the next time the
-- backend starts; run this once afterwards, or tick "Closed status" in
-- Settings > Lead statuses instead. Adjust the keys to your own closed statuses.

UPDATE ticket_statuses
SET "isClosed" = true
WHERE "key" IN ('Closed', 'ClosedLost');

-- Check the result:
-- SELECT "key", "label", "isClosed" FROM ticket_statuses ORDER BY "sortOrder";
