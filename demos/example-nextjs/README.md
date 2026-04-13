# PowerSync Next.js Example

PowerSync demo using [Next.js](https://nextjs.org/) and the [PowerSync JS web SDK](https://docs.powersync.com/client-sdk-references/js-web).

Syncs data from a local Postgres through a self-hosted PowerSync service. No login required; the Next.js server hands out anonymous JWTs signed with a local key pair.

## Architecture

```
Browser (WASQLite)
   ↕ sync (WebSocket)
PowerSync service  <->  Postgres (source DB)
   ↕ bucket storage
Postgres (storage DB)

Browser -> POST /api/data       -> Next.js API route -> Postgres (writes)
Browser -> GET  /api/auth/token -> Next.js API route -> signed JWT
PowerSync -> GET /api/auth/keys -> Next.js API route -> JWKS (public key)
```

## Prerequisites

- [Docker](https://www.docker.com/) (running)
- [PowerSync CLI](https://docs.powersync.com/self-hosting/installation) (`npm i -g @powersync/cli`)
- Node.js >= 18 and [pnpm](https://pnpm.io/)

## Setup

```bash
# 1. Install deps
pnpm install

# 2. Create env file
cp .env.local.template .env.local

# 3. Generate a JWT key pair and paste the output into .env.local
pnpm generate-keys

# 4. Start local Postgres + PowerSync
pnpm local:up

# 5. Start Next.js
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### About the key pair

PowerSync validates JWTs the Next.js app issues by fetching a JWKS at [/api/auth/keys](src/app/api/auth/keys/route.ts). The private key signs tokens; the public key is what PowerSync fetches. Both must be set in `.env.local` — the app will refuse to start token issuance without them.

`pnpm generate-keys` prints base64-encoded JWKs to stdout. Copy the two lines into `.env.local`:

```
POWERSYNC_PRIVATE_KEY=<base64>
POWERSYNC_PUBLIC_KEY=<base64>
```

Restart `pnpm dev` after changing these values.

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── keys/route.ts      JWKS endpoint for PowerSync
│   │   │   └── token/route.ts     Anonymous JWT endpoint
│   │   └── data/route.ts          CRUD writes to Postgres
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CustomerList.tsx
│   ├── StatusPanel.tsx
│   └── SyncedContent.tsx
└── library/
    ├── auth-keys.ts                Loads RSA key pair from env (server only)
    ├── db.ts                       Postgres pool (server only)
    └── powersync/
        ├── connector.ts            Fetch token + upload mutations
        ├── powersync-provider.tsx   PowerSync context provider
        └── schema.ts               Client-side table schema
```

## Environment variables

All config lives in `.env.local`. Docker Compose also reads from this file (via a symlink at `powersync/docker/.env`).

| Variable | Required | What it does |
|---|---|---|
| `POWERSYNC_URL` | yes | PowerSync service URL, also used as the JWT audience |
| `DATABASE_URL` | yes | Postgres connection for Next.js API routes (uses `localhost`) |
| `POWERSYNC_PRIVATE_KEY` | yes | Base64-encoded JWK private key — generate with `pnpm generate-keys` |
| `POWERSYNC_PUBLIC_KEY` | yes | Base64-encoded JWK public key — generate with `pnpm generate-keys` |
| `PS_DATABASE_*` | yes | Postgres credentials used by Docker |
| `PS_STORAGE_*` | yes | Separate Postgres for PowerSync internal storage |
| `PS_DATA_SOURCE_URI` | yes | Postgres URI inside Docker (uses `pg-db` hostname) |
| `PS_STORAGE_SOURCE_URI` | yes | Storage Postgres URI inside Docker (uses `pg-storage` hostname) |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm generate-keys` | Print a fresh JWT key pair for `.env.local` |
| `pnpm local:up` | Start PowerSync + Postgres via Docker |
| `pnpm local:down` | Stop Docker stack |

## Resetting the database

If you change the schema, wipe the Docker volumes so the init SQL runs again:

```bash
powersync docker stop --directory powersync --remove --remove-volumes
powersync docker reset --directory powersync
```
