-- Supabase SQL for E2EE TODOs mirrored from PowerSync raw SQLite table.
-- This table stores only non-sensitive selectors + encrypted envelope parts.

create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text null,
  alg text not null,
  aad text null,
  nonce_b64 text not null,
  cipher_b64 text not null,
  kdf_salt_b64 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.todos enable row level security;

-- Helpful indexes for filtering/sync
create index if not exists idx_todos_user_id on public.todos(user_id);
create index if not exists idx_todos_user_created_at on public.todos(user_id, created_at desc);

drop policy if exists "Users can view own todos" on public.todos;
create policy "Users can view own todos"
  on public.todos for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own todos" on public.todos;
create policy "Users can insert own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own todos" on public.todos;
create policy "Users can update own todos"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own todos" on public.todos;
create policy "Users can delete own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

-- Optionally, add a trigger to update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists set_updated_at on public.todos;
create trigger set_updated_at
before update on public.todos
for each row execute procedure public.set_updated_at();

-- Keyring table: stores wrapped data encryption keys (DEKs)
create table if not exists public.e2ee_keys (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, -- 'password' | 'webauthn'
  alg text not null,
  aad text null,
  nonce_b64 text not null,
  cipher_b64 text not null,
  kdf_salt_b64 text not null, -- may be empty for webauthn/raw
  created_at timestamptz not null default now()
);

alter table public.e2ee_keys enable row level security;

-- Helpful indexes
create unique index if not exists idx_e2ee_keys_user_provider on public.e2ee_keys(user_id, provider);
create index if not exists idx_e2ee_keys_user on public.e2ee_keys(user_id);

drop policy if exists "Users can manage own keys" on public.e2ee_keys;
create policy "Users can manage own keys"
  on public.e2ee_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
