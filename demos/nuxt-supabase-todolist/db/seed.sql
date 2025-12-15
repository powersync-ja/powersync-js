-- Past this into your Superbase SQL Editor

-- Note: change this if changing the DB connection name
-- connect postgres;
-- Create tables
CREATE TABLE public.lists(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  CONSTRAINT lists_pkey PRIMARY KEY (id)
);

CREATE TABLE public.todos(
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NULL,
  description text NOT NULL,
  completed boolean NOT NULL DEFAULT FALSE,
  created_by uuid NULL,
  completed_by uuid NULL,
  list_id uuid NOT NULL,
  photo_id uuid NULL,
  CONSTRAINT todos_pkey PRIMARY KEY (id)
);

-- Creates some initial data to be synced
INSERT INTO lists(
  id,
  name,
  owner_id)
VALUES (
  '75f89104-d95a-4f16-8309-5363f1bb377a',
  'Getting Started',
  gen_random_uuid());

INSERT INTO todos(
  description,
  list_id,
  completed)
VALUES (
  'Run services locally',
  '75f89104-d95a-4f16-8309-5363f1bb377a',
  TRUE);

INSERT INTO todos(
  description,
  list_id,
  completed)
VALUES (
  'Create a todo here. Query the todos table via a Postgres connection. Your todo should be synced',
  '75f89104-d95a-4f16-8309-5363f1bb377a',
  FALSE);

-- Create publication for PowerSync tables
CREATE PUBLICATION powersync FOR ALL TABLES;
