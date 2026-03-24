# PowerSync + Supabase: Time-Based Sync (Local-First)

This demo shows how to use [PowerSync Sync Streams](https://docs.powersync.com/sync/sync-streams) to dynamically control which data is synced to the client. The backend contains a set of issues with `created_at` / `updated_at` as **`TIMESTAMPTZ`** in Postgres. Each selected date creates its own sync stream subscription with a `date` parameter. Toggling dates on or off adds or removes stream subscriptions and PowerSync syncs the matching issues. TTL is set to 0 so data is removed immediately when dates are deselected.

This lets you model patterns like “sync the last N days of data” or “sync only the time ranges the user cares about” without re-deploying sync rules.

The stream definition lives in `powersync/sync-config.yaml`:

```yaml
streams:
  issues_by_date:
    query: |
      SELECT * FROM issues
      WHERE substring(updated_at, 1, 10) = subscription.parameter('date')
```

Postgres `TIMESTAMPTZ` values are handled like text for the first 10 characters (the `YYYY-MM-DD` prefix) in both the sync stream query and on the client replica.

The client implementation is in `src/app/views/issues/page.tsx`. It builds an array of stream options from the selected dates and passes them directly to `useQuery` via the `streams` option:

```tsx
import { useQuery } from '@powersync/react';

const streams = selectedDates.map((date) => ({
  name: 'issues_by_date',
  parameters: { date },
  ttl: 0
}));

const { data: issues } = useQuery(
  'SELECT * FROM issues ORDER BY updated_at DESC',
  [],
  { streams }
);
```

`useQuery` manages the stream subscriptions internally — subscribing to new streams and unsubscribing from removed ones as the array changes.

The demo runs against local Supabase (`supabase start`) and self-hosted PowerSync (via the PowerSync CLI). It uses anonymous Supabase auth — there is no login or registration flow.

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

- the `issues` table (`created_at` / `updated_at` are `TIMESTAMPTZ`)
- RLS policies for authenticated users (including anonymous sessions)
- realtime publication for `issues`
- sample issues used by the time-based sync filters

Run `supabase db reset` to re-apply migrations from scratch (required if you previously applied this migration when `created_at` / `updated_at` were `TEXT`).

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
