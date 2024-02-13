create table public.profiles (
  id uuid not null,
  -- id uuid not null references auth.users on delete cascade
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  handle text unique,
  name text,
  demo boolean default false,
  primary key (id)
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone." on profiles for
select using (true);
create policy "Users can insert their own profile or demo profiles." on profiles for
insert with check (
    auth.uid() = id
    or (
      demo = true
      and auth.uid() is not null
    )
  );
create policy "Users can update their own profile or demo profiles." on profiles for
update using (
    auth.uid() = id
    or demo = true
  ) with check (
    auth.uid() = id
    or demo = true
  );
create policy "Users can delete their own profile or demo profiles." on profiles for delete using (
  auth.uid() = id
  or demo = true
);