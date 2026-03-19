# PowerSync + Supabase: Time-Based Sync (Local-First)

This demo shows how to use [PowerSync Sync Streams](https://docs.powersync.com/sync/sync-streams) to dynamically control which data is synced to the client. The backend contains a set of issues with `created_at` / `updated_at` as **`TIMESTAMPTZ`** in Postgres. The client passes the selected **UTC calendar dates** (`YYYY-MM-DD`) as a JSON array to a single sync stream subscription. Toggling dates on or off updates the array and PowerSync syncs the matching issues. TTL is set to 0 so data is removed immediately when dates are deselected.

This lets you model patterns like "sync the last N days of data" or "sync only the time ranges the user cares about" without re-deploying sync rules.

The stream definition lives in `powersync/sync-config.yaml` and uses `json_each()` to expand the array parameter:

```yaml
streams:
  issues_by_date:
    query: |
      SELECT * FROM issues
      WHERE substring(updated_at, 1, 10) IN (SELECT value FROM json_each(subscription.parameter('dates')))
```

Postgres `TIMESTAMPTZ` values are handled like text for the first 10 characters (the `YYYY-MM-DD` prefix) in both the sync stream query and on the client replica.

The client implementation is in `src/app/views/issues/page.tsx`. It:

1. **Filters the local query** with the same predicate as the stream (`substring(updated_at, 1, 10)` plus bound `?` placeholders), or `WHERE 1 = 0` when no dates are selected.
2. **Subscribes via `useSyncStream` in a small child** that only mounts when at least one date is selected (`ttl: 0` matches immediate eviction when nothing is selected).
3. **Does not pass `streams` into `useQuery`** — doing so resets internal “stream synced” state on every parameter change and briefly clears `data`, which flickers the list when toggling chips quickly.

```tsx
import { useQuery, useSyncStream } from '@powersync/react';

function IssuesByDateStreamSubscription({ datesParam }: { datesParam: string }) {
  useSyncStream({ name: 'issues_by_date', parameters: { dates: datesParam }, ttl: 0 });
  return null;
}

// Inside your page component:
const datesParam = React.useMemo(() => JSON.stringify(selectedDates), [selectedDates]);

const { issuesSql, issuesParams } = React.useMemo(() => {
  if (selectedDates.length === 0) {
    return {
      issuesSql: `SELECT * FROM issues WHERE 1 = 0 ORDER BY created_at DESC`,
      issuesParams: [] as string[]
    };
  }
  const placeholders = selectedDates.map(() => '?').join(', ');
  return {
    issuesSql: `SELECT * FROM issues WHERE substring(updated_at, 1, 10) IN (${placeholders}) ORDER BY created_at DESC`,
    issuesParams: selectedDates
  };
}, [selectedDates]);

const { data: issues } = useQuery(issuesSql, issuesParams);

return (
  <>
    {selectedDates.length > 0 ? (
      <IssuesByDateStreamSubscription datesParam={datesParam} />
    ) : null}
    {/* …render chips and list from `issues`… */}
  </>
);
```

In the repo, those `SELECT * FROM issues` fragments use `` `${ISSUES_TABLE}` `` from `src/library/powersync/AppSchema.ts` (the table name is `'issues'`), and the hook is `useQuery<IssueRecord>(issuesSql, issuesParams)`.

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
