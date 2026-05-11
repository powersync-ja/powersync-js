# PowerSync + Convex Demo App

A React todo-list demo that syncs data between Convex and local SQLite via PowerSync. **No separate Node.js backend required** — auth is handled by Convex Auth and mutations are called directly via the Convex client.

## Architecture

```
Browser (React + PowerSync SDK)
  ├── Auth tokens ──► Convex Auth (JWT issued by Convex)
  ├── Mutations   ──► Convex client mutations (lists:create, todos:update, etc.)
  └── Sync        ◄── PowerSync Service  ◄── Convex streaming export
```

## Prerequisites

- Docker
- Node.js and pnpm
- Project dependencies installed with `pnpm install`

## Quick Start

```bash
pnpm install

cp .env.template .env.local
```

Start the local development stack:

```bash
pnpm dev:local
```

This starts Convex, configures Convex Auth JWKS if needed, starts the PowerSync Docker services, and starts the Vite dev server.

> Note: The local development setup assumes Convex is running locally. Linking this demo to a cloud development Convex deployment requires additional configuration.

Open the URL printed by Vite, usually `http://localhost:5173`.

### Environment Variables

| Variable               | Default                 | Description             |
| ---------------------- | ----------------------- | ----------------------- |
| `VITE_CONVEX_URL`      | `http://127.0.0.1:3210` | Convex backend URL      |
| `VITE_CONVEX_SITE_URL` | `http://127.0.0.1:3211` | Convex HTTP actions URL |
| `VITE_POWERSYNC_URL`   | `http://localhost:8080` | PowerSync service URL   |

`pnpm dev:local` obtains the local Convex deploy key automatically and passes it to PowerSync as `PS_CONVEX_DEPLOY_KEY`.

## Authentication

Convex Auth handles user authentication (email/password). The Convex Auth session JWT is reused directly for PowerSync authentication. PowerSync verifies the token via Convex Auth's built-in JWKS endpoint at `/.well-known/jwks.json`.

## Mutations

Client writes go into the PowerSync upload queue, which calls `uploadData()` in the connector. This calls Convex mutations directly via the `ConvexReactClient` (e.g. `lists:create`, `todos:update`, `todos:remove`).
