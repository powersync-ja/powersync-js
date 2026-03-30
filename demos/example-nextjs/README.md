# PowerSync Next.js Example

A local-first demo using [Next.js](https://nextjs.org/) and the [PowerSync JS web SDK](https://docs.powersync.com/client-sdk-references/js-web).

Data is synced from a local Postgres database through a self-hosted PowerSync service. Authentication is anonymous — the Next.js server issues signed JWTs without any login flow.

## Architecture

```
Browser (WASQLite)
   ↕ sync (WebSocket)
PowerSync service  ←→  Postgres (source DB)
   ↕ bucket storage
Postgres (storage DB)

Browser → POST /api/data → Next.js API route → Postgres (mutations)
Browser → GET  /api/auth/token → Next.js API route → anonymous JWT
PowerSync → GET /api/auth/keys → Next.js API route → JWKS (public key)
```

## Prerequisites

- [Docker](https://www.docker.com/) (running)
- [PowerSync CLI](https://docs.powersync.com/self-hosting/installation) (`npm i -g @powersync/cli`)
- Node.js ≥ 18 and [pnpm](https://pnpm.io/)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create your env file (single source of truth for all config)
cp .env.local.template .env.local

# 3. Start the local PowerSync stack (Postgres + PowerSync service)
pnpm local:up

# 4. Start the Next.js dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

All configuration lives in `.env.local` — both the Next.js server and Docker Compose read from this single file. The template (`.env.local.template`) contains defaults that work out of the box.

| Variable | Description |
|---|---|
| `POWERSYNC_URL` | PowerSync service URL (used by the browser and as JWT audience) |
| `DATABASE_URL` | Postgres connection string for Next.js API routes (uses `localhost`) |
| `PS_DATABASE_*` | Postgres credentials shared with Docker containers |
| `PS_STORAGE_*` | Separate Postgres instance for PowerSync internal storage |
| `PS_DATA_SOURCE_URI` | Postgres URI for PowerSync replication (uses Docker service hostname) |
| `PS_STORAGE_SOURCE_URI` | Storage Postgres URI for PowerSync (uses Docker service hostname) |

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm local:up` | Start PowerSync + Postgres Docker stack |
| `pnpm local:down` | Stop Docker stack |

## Resetting the database

If you change the database schema, remove the Docker volumes so the init SQL reruns:

```bash
powersync docker stop --directory powersync --remove --remove-volumes
powersync docker reset --directory powersync
```
