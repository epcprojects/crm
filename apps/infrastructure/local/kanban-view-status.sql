CREATE TABLE IF NOT EXISTS "tickets_kanban_view" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "projectId" uuid NULL,
    "statusId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "sortOrder" integer NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT "PK_TICKETS_KANBAN_VIEW"
        PRIMARY KEY ("id"),

    CONSTRAINT "UQ_TICKETS_KANBAN_VIEW_USER_STATUS"
        UNIQUE ("userId", "statusId"),

    CONSTRAINT "FK_TICKETS_KANBAN_VIEW_PROJECT"
        FOREIGN KEY ("projectId")
        REFERENCES "projects"("id")
        ON DELETE CASCADE,

    CONSTRAINT "FK_TICKETS_KANBAN_VIEW_STATUS"
        FOREIGN KEY ("statusId")
        REFERENCES "ticket_statuses"("id")
        ON DELETE CASCADE,

    CONSTRAINT "FK_TICKETS_KANBAN_VIEW_USER"
        FOREIGN KEY ("userId")
        REFERENCES "users"("id")
        ON DELETE CASCADE
);




CREATE INDEX IF NOT EXISTS "IDX_TICKETS_KANBAN_VIEW_USER_ID"
    ON "tickets_kanban_view" ("userId");

CREATE INDEX IF NOT EXISTS "IDX_TICKETS_KANBAN_VIEW_STATUS_ID"
    ON "tickets_kanban_view" ("statusId");

CREATE INDEX IF NOT EXISTS "IDX_TICKETS_KANBAN_VIEW_PROJECT_ID"
    ON "tickets_kanban_view" ("projectId");

CREATE INDEX IF NOT EXISTS "IDX_TICKETS_KANBAN_VIEW_USER_SORT_ORDER"
    ON "tickets_kanban_view" ("userId", "sortOrder");


ALTER TABLE "tickets_kanban_view"
ADD CONSTRAINT "CHK_TICKETS_KANBAN_VIEW_SORT_ORDER"
CHECK ("sortOrder" >= 0);




-- Create the sequence TypeORM's @Generated('increment') expects
CREATE SEQUENCE IF NOT EXISTS ticket_statuses_sortorder_seq;

-- Point the column's default at it
ALTER TABLE ticket_statuses
  ALTER COLUMN "sortOrder" SET DEFAULT nextval('ticket_statuses_sortorder_seq');

-- Tie the sequence's lifecycle to the column (dropped together, etc.)
ALTER SEQUENCE ticket_statuses_sortorder_seq
  OWNED BY ticket_statuses."sortOrder";

-- Fast-forward the sequence past whatever sortOrder values already exist,
-- so the next insert doesn't collide with existing rows
SELECT setval(
  'ticket_statuses_sortorder_seq',
  COALESCE((SELECT MAX("sortOrder") FROM ticket_statuses), 0) + 1,
  false
);


CREATE SEQUENCE ticket_statuses_sortorder_seq;

CREATE TABLE ticket_statuses (
  -- ... your existing id/createdAt/updatedAt columns from TimestampEntity ...
  "key" varchar(60) NOT NULL UNIQUE,
  "label" varchar(80) NOT NULL,
  "color" varchar(7) NOT NULL DEFAULT '#888780',
  "sortOrder" integer NOT NULL DEFAULT nextval('ticket_statuses_sortorder_seq'),
  -- ...
);

ALTER SEQUENCE ticket_statuses_sortorder_seq
  OWNED BY ticket_statuses."sortOrder";