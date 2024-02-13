create table public.groups (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    owner_id uuid not null references profiles on delete cascade,
    name text not null,
    primary key (id)
);
alter table public.groups enable row level security;
create policy "Groups are viewable by their members." on groups for
select using (auth.uid() = owner_id);
create policy "Users can insert their own groups." on groups for
insert with check (auth.uid() = owner_id);
create policy "Users can update own groups." on groups for
update using (auth.uid() = owner_id);