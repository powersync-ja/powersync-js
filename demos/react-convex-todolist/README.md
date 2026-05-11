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
```

Start the local development stack:

```bash
pnpm dev:local
```

This starts the self-hosted PowerSync and Convex Docker services, configures Convex Auth JWT/JWKS if needed, and starts the Convex and Vite dev servers.

The app defaults to local services, so `.env.local` is optional. Copy `.env.template` to `.env.local` only when using custom service URLs.

Open the URL printed by Vite, usually `http://localhost:5173`.

The Convex dashboard is available at `http://localhost:6791` after `pnpm dev:local` starts the Docker services. Use the deploy key from [`powersync/docker/setup_data/deploy_key`](./powersync/docker/setup_data/deploy_key) when prompted for the admin secret.

### Environment Variables

| Variable               | Default                 | Description                                                  |
| ---------------------- | ----------------------- | ------------------------------------------------------------ |
| `PS_CONVEX_PORT`       | `3210`                  | Host port for the local self-hosted Convex backend           |
| `PS_CONVEX_SITE_PORT`  | `3211`                  | Host port for local self-hosted Convex HTTP actions and JWKS |
| `VITE_CONVEX_URL`      | `http://127.0.0.1:3210` | Convex backend URL                                           |
| `VITE_CONVEX_SITE_URL` | `http://127.0.0.1:3211` | Convex HTTP actions URL                                      |
| `VITE_POWERSYNC_URL`   | `http://localhost:8080` | PowerSync service URL                                        |

`pnpm dev:local` obtains the self-hosted Convex deploy key from `powersync/docker/setup_data/deploy_key` after `powersync docker reset` starts the Docker services.

## Authentication

Convex Auth handles user authentication (email/password). The Convex Auth session JWT is reused directly for PowerSync authentication. PowerSync verifies the token via Convex Auth's built-in JWKS endpoint at `/.well-known/jwks.json`.

## Mutations

Client writes go into the PowerSync upload queue, which calls `uploadData()` in the connector. This calls Convex mutations directly via the `ConvexReactClient` (e.g. `lists:create`, `todos:update`, `todos:remove`).
