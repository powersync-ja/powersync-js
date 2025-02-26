
-- tables

-- custom app_base64 type, to allow querying and updating binary data as base64
-- via postgrest/supabase-js
create domain app_base64 as bytea;

-- For query responses
CREATE OR REPLACE FUNCTION json(app_base64) RETURNS json AS $$
  select to_json(encode($1, 'base64'));
$$ LANGUAGE SQL IMMUTABLE;
CREATE CAST (app_base64 AS json) WITH FUNCTION json(app_base64) AS IMPLICIT;

-- For uploading
CREATE OR REPLACE FUNCTION app_base64(json) RETURNS public.app_base64 AS $$
  -- here we reuse the previous app_uuid(text) function
  select decode($1 #>> '{}', 'base64');
$$ LANGUAGE SQL IMMUTABLE;

CREATE CAST (json AS public.app_base64) WITH FUNCTION app_base64(json) AS IMPLICIT;

CREATE TABLE documents(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  title VARCHAR(255),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE document_updates(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  created_at timestamptz DEFAULT now(),
  document_id UUID, 
  update_data app_base64
);


-- publication for powersync
DROP PUBLICATION IF EXISTS powersync;
CREATE PUBLICATION powersync FOR TABLE documents, document_updates;


-- database functions
CREATE OR REPLACE FUNCTION get_document_update_data(document_id uuid) RETURNS text as $$
  SELECT JSON_AGG(update_data) as updates FROM document_updates WHERE document_id=$1; 
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION insert_document_updates(batch TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO document_updates (id, document_id, update_data)
    SELECT
      (elem->>'id')::UUID,
      (elem->>'document_id')::UUID,
      decode(elem->>'update_b64', 'base64')
    FROM json_array_elements(batch::json) AS elem
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
