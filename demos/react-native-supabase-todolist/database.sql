-- Create tables
create table
  public.lists (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    name text not null,
    owner_id uuid not null,
    constraint lists_pkey primary key (id),
    constraint lists_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;

create table
  public.todos (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    completed_at timestamp with time zone null,
    description text not null,
    completed boolean not null default false,
    created_by uuid null,
    completed_by uuid null,
    list_id uuid not null,
    photo_id uuid null,
    constraint todos_pkey primary key (id),
    constraint todos_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null,
    constraint todos_completed_by_fkey foreign key (completed_by) references auth.users (id) on delete set null,
    constraint todos_list_id_fkey foreign key (list_id) references lists (id) on delete cascade
  ) tablespace pg_default;

-- Create publication for powersync
create publication powersync for table lists, todos;

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table public.lists
  enable row level security;

alter table public.todos
  enable row level security;

create policy "owned lists" on public.lists for ALL using (
  auth.uid() = owner_id
);

create policy "todos in owned lists" on public.todos for ALL using (
  auth.uid() IN (
    SELECT lists.owner_id FROM lists WHERE (lists.id = todos.list_id)
  )
);

-- This trigger automatically creates some sample data when a user registers.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers for more details.
create function public.handle_new_user_sample_data()
returns trigger as $$
declare
  new_list_id uuid;
begin
  insert into public.lists (name, owner_id)
    values ('Shopping list', new.id)
    returning id into new_list_id;
  
  insert into public.todos(description, list_id, created_by)
    values ('Bread', new_list_id, new.id);

  insert into public.todos(description, list_id, created_by)
    values ('Apples', new_list_id, new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger new_user_sample_data after insert on auth.users for each row execute procedure public.handle_new_user_sample_data();

-- Attachments
-- Ensure you have created a storage bucket named: 'media'
-- Policies for storage allowing users to read and write their own files
CREATE POLICY "Select media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'media');
CREATE POLICY "Insert media" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'media');
CREATE POLICY "Update media" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'media');
CREATE POLICY "Delete media" ON storage.objects FOR DELETE TO public USING (bucket_id = 'media');