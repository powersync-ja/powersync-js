-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NULL,
  description text NOT NULL,
  completed boolean NOT NULL DEFAULT FALSE,
  user_id uuid NOT NULL,
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

-- Create publication for PowerSync
CREATE PUBLICATION powersync FOR ALL TABLES;
