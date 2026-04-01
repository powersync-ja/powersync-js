# PowerSync Next.js Example

PowerSync demo using [Next.js](https://nextjs.org/) and the [PowerSync JS web SDK](https://docs.powersync.com/client-sdk-references/js-web).

Syncs data from a local Postgres through a self-hosted PowerSync service. No login required; the Next.js server hands out anonymous JWTs.

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
# Install deps
pnpm install

# Create env file (defaults work out of the box)
cp .env.local.template .env.local

# Start local Postgres + PowerSync
pnpm local:up

# Start Next.js
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

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
│   ├── page.tsx
│   └── providers.tsx               PowerSync provider
├── components/
│   ├── CustomerList.tsx
│   ├── StatusPanel.tsx
│   └── SyncedContent.tsx           Client component for sync state
└── library/
    ├── auth-keys.ts                RSA key pair (server only)
    ├── db.ts                       Postgres pool (server only)
    └── powersync/
        ├── connector.ts            Fetch token + upload mutations
        ├── powersync-provider.tsx   PowerSync context provider
        └── schema.ts               Client-side table schema
```

## Environment variables

All config lives in `.env.local`. Docker Compose also reads from this file (via a symlink at `powersync/docker/.env`). The template has working defaults.

| Variable | What it does |
|---|---|
| `POWERSYNC_URL` | PowerSync service URL, also used as the JWT audience |
| `DATABASE_URL` | Postgres connection for Next.js API routes (uses `localhost`) |
| `PS_DATABASE_*` | Postgres credentials used by Docker |
| `PS_STORAGE_*` | Separate Postgres for PowerSync internal storage |
| `PS_DATA_SOURCE_URI` | Postgres URI inside Docker (uses `pg-db` hostname) |
| `PS_STORAGE_SOURCE_URI` | Storage Postgres URI inside Docker (uses `pg-storage` hostname) |
| `POWERSYNC_PRIVATE_KEY` | (Optional) Base64-encoded JWK private key. Auto-generated if not set |
| `POWERSYNC_PUBLIC_KEY` | (Optional) Base64-encoded JWK public key. Auto-generated if not set |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm local:up` | Start PowerSync + Postgres via Docker |
| `pnpm local:down` | Stop Docker stack |

## Resetting the database

If you change the schema, wipe the Docker volumes so the init SQL runs again:

```bash
powersync docker stop --directory powersync --remove --remove-volumes
powersync docker reset --directory powersync
```
