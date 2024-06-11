-- Create pebbles table
create table
  public.pebbles (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    shape text not null,
    user_id uuid null,
    constraint pebbles_pkey primary key (id)
) tablespace pg_default;

-- Setup RLS for table
alter table public.pebbles enable row level security;

create policy "owned pebbles" on "public"."pebbles" for ALL using (
  (auth.uid() = user_id)
);

-- Create publication for powersync
create publication powersync for table public.pebbles;

-- Create operations table, used for telemetry. This table doesn't need to be synced to the device.
create table
  public.operations (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    operation text not null,
    user_id uuid null,
    constraint operations_pkey primary key (id)
) tablespace pg_default;

-- Setup RLS for table
alter table public.operations enable row level security;

create policy "user operations" on "public"."operations" for ALL using (
  (auth.uid() = user_id)
);