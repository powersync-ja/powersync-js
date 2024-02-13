create table public.memberships (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    group_id uuid not null references groups on delete cascade,
    profile_id uuid not null references profiles on delete cascade,
    primary key (id)
);
create function is_member_of(_profile_id uuid, _group_id uuid) returns bool as $$
select exists (
        select 1
        from memberships
        where group_id = _group_id
            and profile_id = _profile_id
    );
$$ language sql security definer;
alter table public.memberships enable row level security;
create policy "Memberships are viewable by group members." on memberships for
select using (
        is_member_of(auth.uid(), memberships.group_id)
        or exists (
            select 1
            from public.groups
            where groups.owner_id = auth.uid()
                and groups.id = memberships.group_id
        )
    );
create policy "Memberships can be created by group owners." on memberships for
insert with check (
        exists (
            select 1
            from public.groups
            where groups.owner_id = auth.uid()
                and groups.id = memberships.group_id
        )
    );
create policy "Memberships can be updated by group owners." on memberships for
update using (
        exists (
            select 1
            from public.groups
            where groups.owner_id = auth.uid()
                and groups.id = memberships.group_id
        )
    ) with check (
        exists (
            select 1
            from public.groups
            where groups.owner_id = auth.uid()
                and groups.id = memberships.group_id
        )
    );
create policy "Memberships can be deleted by group owners." on memberships for delete using (
    exists (
        select 1
        from public.groups
        where groups.owner_id = auth.uid()
            and groups.id = memberships.group_id
    )
);