create table public.contacts (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    owner_id uuid not null references profiles on delete cascade,
    profile_id uuid not null references profiles on delete cascade,
    primary key (id)
);
alter table public.contacts enable row level security;
create policy "Contacts are viewable by their owner." on contacts for
select using (auth.uid() = owner_id);
create policy "Users can insert their own contacts." on contacts for
insert with check (auth.uid() = owner_id);
create policy "Users can update own contacts." on contacts for
update using (auth.uid() = owner_id);