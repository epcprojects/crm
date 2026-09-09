
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
-----------------creating indexes:
CREATE INDEX idx_ticket_title_trgm ON tickets USING gin (title gin_trgm_ops);
CREATE INDEX idx_ticket_description_trgm ON tickets USING gin (description gin_trgm_ops);
CREATE INDEX idx_ticket_refno_trgm ON tickets USING gin ("ticketRefNo" gin_trgm_ops);