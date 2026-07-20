CREATE SEQUENCE IF NOT EXISTS project_code_seq
start with 1
increment by 1
minvalue 1
no maxvalue 
cache 1;


CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;

ALTER SEQUENCE public.ticket_number_seq
    OWNER TO postgres;


CREATE OR REPLACE FUNCTION public.generate_ticket_number(
	p_project_code character varying,
	p_date_key character)
    RETURNS character varying
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
  v_seq INT;
BEGIN
  -- Per-project + date sequence (kept for future use)
  -- INSERT INTO ticket_sequences (project_code, date_key, last_seq)
  -- VALUES (p_project_code, p_date_key, 1)
  -- ON CONFLICT (project_code, date_key)
  -- DO UPDATE SET last_seq = ticket_sequences.last_seq + 1
  -- RETURNING last_seq INTO v_seq;
  -- IF v_seq > 9999999 THEN
  --   RAISE EXCEPTION 'Ticket sequence exhausted for project % on %',
  --     p_project_code, p_date_key;
  -- END IF;
  -- RETURN p_project_code || '-' || p_date_key || '-' || LPAD(v_seq::TEXT, 7, '0');

  RETURN 'HH-' || LPAD(nextval('ticket_number_seq')::TEXT, 3, '0');
END;
$BODY$;

ALTER FUNCTION public.generate_ticket_number(character varying, character)
    OWNER TO postgres;