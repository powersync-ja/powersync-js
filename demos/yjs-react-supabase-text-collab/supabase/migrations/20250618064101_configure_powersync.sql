
-- tables
CREATE TABLE documents(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  title VARCHAR(255),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE document_updates(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  created_at timestamptz DEFAULT now(),
  document_id UUID, 
  update_data BYTEA
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
