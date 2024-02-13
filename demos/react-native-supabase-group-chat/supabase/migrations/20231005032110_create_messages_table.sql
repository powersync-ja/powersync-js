create table public.messages (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    sender_id uuid not null references profiles on delete cascade,
    recipient_id uuid null references profiles on delete cascade,
    group_id uuid null references groups on delete cascade,
    content text not null,
    sent_at timestamp with time zone null default null,
    primary key (id)
);
alter table public.messages enable row level security;
create policy "Messages are viewable by senders and recipients." on messages for
select using (
        auth.uid() = sender_id
        or auth.uid() = recipient_id
    );
create policy "Senders can insert their own messages." on messages for
insert with check (
        auth.uid() = sender_id
        or auth.uid() = recipient_id
    );
-- For demo purposes, user can create messages for other users
create policy "Senders can update their own messages." on messages for
update using (
        auth.uid() = sender_id
        or auth.uid() = recipient_id
    ) with check (
        auth.uid() = sender_id
        or auth.uid() = recipient_id
    );
create policy "Senders can update own messages." on messages for
update using (
        auth.uid() = sender_id
        or auth.uid() = recipient_id
    );