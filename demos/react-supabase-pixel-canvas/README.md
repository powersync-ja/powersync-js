# PowerSync Pixel Canvas

A collaborative r/place-style pixel canvas built on [PowerSync](https://powersync.com) + Supabase,
designed as a conference booth demo. A big **booth** screen shows the shared 32×32 canvas and a QR
code; visitors scan it to open the **draw** page on their phones, place pixels, and watch changes
sync in real time — including offline queue + resume.

## Pages

- **`/` — Booth**: fullscreen canvas, live stats ticker (pixels placed + distinct artists), and a QR
  code linking to `/draw`.
- **`/draw` — Draw**: mobile-first. Pick a colour, tap a cell to place a pixel, toggle the PowerSync
  connection on/off, and see the pending upload queue.

## Running standalone (no backend)

The app works with **no backend configured**. In this mode the 32×32 canvas is seeded locally in
SQLite and pixels stay on-device (never uploaded).

```bash
pnpm install
pnpm dev
```

Open the booth at http://localhost:5173/ and the draw page at http://localhost:5173/draw.

To test from a phone on the same network, run `pnpm dev --host` and scan the QR code (it is built
from `window.location.origin`, so the booth machine's origin must be reachable from the phone).

## Running with sync (Supabase Cloud + PowerSync Cloud)

Two config files in this folder drive the backend:

- [`database.sql`](./database.sql) — table, 1024-cell seed, RLS policies, and the `powersync` publication.
- [`sync-config.yaml`](./sync-config.yaml) — the PowerSync sync rules (one shared stream over all pixels).

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL editor**, paste and run [`database.sql`](./database.sql). This creates the `pixels`
   table, seeds all 1024 cells white, enables RLS (read + update for the `authenticated` role, which
   covers anonymous sessions), and creates the `powersync` publication.
3. Under **Authentication → Providers** (Project Settings), enable **Allow anonymous sign-ins** and
   save. Each booth visitor becomes a distinct anonymous user.

### 2. PowerSync

1. Create an instance in the [PowerSync dashboard](https://powersync.journeyapps.com/).
2. **Connections** tab → add a database connection to your Supabase Postgres: paste the connection
   string from Supabase (**Project Settings → Database**), using the **direct connection** (turn
   connection pooling **off**), enter the DB password, and **Test connection**.
3. **Credentials** tab → tick **Use Supabase Auth** and paste your Supabase **JWT secret** (Supabase
   → Project Settings → API → JWT Settings). This lets PowerSync validate the anon-user tokens the
   client sends.
4. **Sync rules** → paste the contents of [`sync-config.yaml`](./sync-config.yaml) into the editor
   and **Deploy**.

### 3. Client env vars

```bash
cp .env.local.template .env.local
```

Fill in all three:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase anon key>
VITE_POWERSYNC_URL=https://<instance>.powersync.journeyapps.com
```

Then `pnpm dev`. With these set, the app **does not seed locally** — it signs in anonymously,
connects, and the 1024 cells arrive via sync. Open the booth on one device and `/draw` on another
(or several) and watch pixels sync in real time.

> The client only ever issues `UPDATE`s (never inserts), which is why the server table must be
> pre-seeded by `database.sql`. A placed pixel is a PATCH against an existing `x:y` row, resolved
> last-write-wins.

See the [PowerSync + Supabase integration guide](https://docs.powersync.com/integration-guides/supabase-+-powersync)
for more detail on the Cloud connection wizard.

## Storage

- **Safari (macOS/iOS)**: in-memory database (WebKit's OPFS support has been the flakiest). Note:
  until `@powersync/web` ships `WASQLiteVFS.InMemoryVfs` (> 1.38.6) this falls back to the
  WebKit-safe IndexedDB VFS automatically — no code change needed on upgrade.
- **Everything else**: persistent OPFS.

## Admin (booth)

- **⇧C** — clear the entire canvas (with confirmation).
- **⇧E** — export the current canvas as a 1024×1024 PNG.
- Add `?admin=1` to the URL to show these as on-screen buttons.

Clearing while connected queues ~1024 PATCH uploads (one per cell) through the row-by-row connector,
which can take a minute or two to drain. For an instant reset, run the equivalent `UPDATE` in the
Supabase SQL editor.

## Notes

- "Pixels placed" counts cells currently coloured by a real user (not the seed), not a cumulative
  event total — the schema has no event log by design.
