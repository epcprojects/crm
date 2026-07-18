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