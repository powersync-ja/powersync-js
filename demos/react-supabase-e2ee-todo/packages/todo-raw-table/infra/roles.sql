-- Run in Supabase SQL editor with an admin user.

-- PowerSync role (read-only + replication)
-- This is the role PowerSync connects with. Replace password with a strong one.
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Publication for replication (name must be 'powersync')
-- Create once. You can narrow the set of tables if desired.
CREATE PUBLICATION powersync FOR ALL TABLES;
