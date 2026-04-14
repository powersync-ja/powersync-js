CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Seed data
INSERT INTO customers (id, name, created_at) VALUES
  (gen_random_uuid()::text, 'Alice Johnson', now()::text),
  (gen_random_uuid()::text, 'Bob Smith',     now()::text),
  (gen_random_uuid()::text, 'Carol White',   now()::text);

-- PowerSync requires a logical replication publication
CREATE PUBLICATION powersync FOR TABLE customers;
