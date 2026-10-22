-- Chats belong to a (possibly anonymous) Supabase user.
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User messages are written by the client and have status 'done'.
-- Assistant messages are created by the client as an empty 'pending' placeholder. The AI worker (worker/) fills in
-- `content` as tokens arrive and moves the status through 'streaming' to 'done', 'stopped' or 'error'.
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats (id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('pending', 'streaming', 'done', 'stopped', 'error')),
  -- How many times the worker wrote the reply. Each write syncs to clients as one update.
  write_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_chat_id_created_at_idx ON public.messages (chat_id, created_at);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chats"
  ON public.chats FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage messages in their own chats"
  ON public.messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.chats WHERE chats.id = chat_id AND chats.user_id = auth.uid())
  );

-- Wake the AI worker when a pending assistant message reaches Postgres: a new placeholder, or a reply the user retried.
-- Clients can queue messages while offline, so this fires whenever PowerSync uploads them, not necessarily when the
-- user pressed send.
CREATE FUNCTION public.notify_assistant_reply_requested() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('assistant_reply_requested', NEW.id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER assistant_reply_requested
  AFTER INSERT OR UPDATE OF status ON public.messages
  FOR EACH ROW
  WHEN (NEW.role = 'assistant' AND NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_assistant_reply_requested();

-- Tell the AI worker when the user stops a reply. Only the SSE streaming mode needs this: in the Postgres mode, the
-- worker notices on its next write to the row.
CREATE FUNCTION public.notify_assistant_reply_stopped() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('assistant_reply_stopped', NEW.id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER assistant_reply_stopped
  AFTER UPDATE OF status ON public.messages
  FOR EACH ROW
  WHEN (NEW.role = 'assistant' AND NEW.status = 'stopped' AND OLD.status IS DISTINCT FROM 'stopped')
  EXECUTE FUNCTION public.notify_assistant_reply_stopped();
