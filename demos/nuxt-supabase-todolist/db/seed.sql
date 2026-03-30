-- Past this into your Superbase SQL Editor

-- TODO change this if changing the DB connection name
-- connect postgres;
-- Create tables

CREATE TABLE IF NOT EXISTS public.tasks(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NULL,
  description text NOT NULL,
  completed boolean NOT NULL DEFAULT FALSE,
  user_id uuid NOT NULL,
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

-- Create a role/user with replication privileges for PowerSync
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'postgres_12345';
-- Set up permissions for the newly created role
-- Read-only (SELECT) access is required
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;  

-- Optionally, grant SELECT on all future tables (to cater for schema additions)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role; 


-- Create publication for PowerSync tables
CREATE PUBLICATION powersync FOR ALL TABLES;
