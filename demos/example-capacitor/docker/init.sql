-- Runs once, when the Postgres volume is created.

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enough rows that the first sync takes a moment, so download progress is visible.
INSERT INTO customers (name)
SELECT 'Customer ' || n FROM generate_series(1, 10000) AS n;

CREATE PUBLICATION powersync FOR ALL TABLES;

-- The PowerSync service keeps its sync storage in a database of its own.
CREATE DATABASE powersync_storage;
