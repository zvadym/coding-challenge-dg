CREATE TABLE IF NOT EXISTS "health_checks" (
  "id" serial PRIMARY KEY NOT NULL,
  "service" varchar(64) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
