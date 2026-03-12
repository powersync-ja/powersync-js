# PowerSync + Supabase: Time-Based Sync (Local-First)

This demo runs against:

- local Supabase (`supabase start`)
- local PowerSync (self-hosted via the PowerSync CLI)

It uses anonymous Supabase auth, so there is no login or registration flow in the app.

## What this demo shows

- PowerSync Sync Streams (edition 3)
- time-based filtering with stream parameters
- offline-first reads/writes with a local PowerSync database

The stream definition lives in `powersync/sync-config.yaml`:

```yaml
config:
  edition: 3

streams:
  issues_by_date:
    query: SELECT * FROM issues WHERE substring(updated_at, 1, 10) = subscription.parameter('date')
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (running)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [PowerSync CLI](https://docs.powersync.com/tools/cli)

## Local development (recommended)

1. Switch into this demo:

   ```bash
   cd demos/react-supabase-time-based-sync
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create env file:

   ```bash
   cp .env.local.template .env.local
   ```

   The template already contains the well-known local Supabase anon key, so no manual changes are needed.

4. Start local Supabase + local PowerSync:

   ```bash
   pnpm local:up
   ```

   This does three things:
   - starts Supabase Docker services
   - starts PowerSync using the checked-in `powersync/service.yaml`
   - loads sync streams from `powersync/sync-config.yaml`

5. Start the app:

   ```bash
   pnpm dev
   ```

Open [http://localhost:5173](http://localhost:5173).

## Database setup and seed data

The schema and seed data are in `supabase/migrations/20260312000000_init_issues.sql`.

When Supabase starts for the first time, the migration creates:

- the `issues` table
- RLS policies for authenticated users (including anonymous sessions)
- realtime publication for `issues`
- sample issues used by the time-based sync filters

If you want to re-apply from scratch:

```bash
supabase db reset
```

## Notes

- The app signs in with `signInAnonymously()` automatically in the connector.
- No login/register routes are used in this demo.
- To stop local services:

  ```bash
  pnpm local:down
  ```

## Learn More

- [PowerSync CLI docs](https://docs.powersync.com/tools/cli)
- [PowerSync Sync Streams](https://docs.powersync.com/sync/sync-streams)
- [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
