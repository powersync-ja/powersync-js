-- Runs once, when the pg-db container first creates its data volume (see ../postgres.database.compose.yaml).
-- The backend API (server/) is the only writer, so there is no row-level security: it checks ownership itself.

-- Chats belong to a user id the app made up (see src/library/powersync/BackendConnector.ts).
CREATE TABLE chats (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- For the foreign key in messages, which ties each message to its chat's owner.
  UNIQUE (id, user_id)
);

-- User messages are written by the client and have status 'done'.
-- Assistant messages are created by the client as an empty 'pending' placeholder. The backend generates the reply and
-- moves the status through 'streaming' to 'done' or 'error', unless the user stops it ('stopped').
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('pending', 'streaming', 'done', 'stopped', 'error')),
  -- How many times the backend wrote the reply. Each write syncs to clients as one update.
  write_count INTEGER NOT NULL DEFAULT 0,
  -- Set by the backend each time it claims a reply. Its later writes check it, so when a reply is stopped and retried
  -- before the old attempt notices, the old attempt can't overwrite the new one.
  claim_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A message can only be in a chat of the same user.
  FOREIGN KEY (chat_id, user_id) REFERENCES chats (id, user_id) ON DELETE CASCADE
);

CREATE INDEX messages_chat_id_created_at_idx ON messages (chat_id, created_at);

-- PowerSync replicates the tables in this publication.
CREATE PUBLICATION powersync FOR TABLE chats, messages;
