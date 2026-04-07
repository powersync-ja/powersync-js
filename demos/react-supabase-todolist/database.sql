-- Create the lists table
CREATE TABLE IF NOT EXISTS public.lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create the todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  description text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users (id),
  completed_by uuid REFERENCES auth.users (id)
);

-- Enable Row Level Security
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- RLS policies for lists: users can only access their own lists
CREATE POLICY "Users can view their own lists" ON public.lists
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own lists" ON public.lists
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own lists" ON public.lists
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own lists" ON public.lists
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS policies for todos: users can only access todos in their own lists
CREATE POLICY "Users can view todos in their lists" ON public.todos
  FOR SELECT USING (
    list_id IN (SELECT id FROM public.lists WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can insert todos in their lists" ON public.todos
  FOR INSERT WITH CHECK (
    list_id IN (SELECT id FROM public.lists WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update todos in their lists" ON public.todos
  FOR UPDATE USING (
    list_id IN (SELECT id FROM public.lists WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete todos in their lists" ON public.todos
  FOR DELETE USING (
    list_id IN (SELECT id FROM public.lists WHERE owner_id = auth.uid())
  );

-- Create PowerSync role for replication access
CREATE ROLE powersync_role REPLICATION LOGIN;
GRANT SELECT ON public.lists TO powersync_role;
GRANT SELECT ON public.todos TO powersync_role;

-- Create PowerSync publication
-- Note: FOR ALL TABLES is simplest for dev. In production, specify tables explicitly.
CREATE PUBLICATION powersync FOR TABLE public.lists, public.todos;