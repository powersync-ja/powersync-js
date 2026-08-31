# PowerSync + Supabase Web Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for Web](https://www.npmjs.com/package/@powersync/web) together with Supabase.

This demo uses [Sync Streams](https://docs.powersync.com/usage/sync-streams). Both lists and todos are auto-subscribed.

## Run Demo

### 1. Supabase Setup

Create a new Supabase project, then run the contents of [`database.sql`](./database.sql) in the [Supabase SQL editor](https://supabase.com/dashboard/project/_/sql). This will:

- Create the `lists` and `todos` tables
- Enable Row Level Security (RLS) so users can only access their own data
- Create a `powersync` publication for replication

### 2. PowerSync Setup

Create a new PowerSync instance connected to your Supabase project ([instructions here](https://docs.powersync.com/integration-guides/supabase-+-powersync#connect-powersync-to-your-supabase)).

In the PowerSync dashboard, go to **Sync Streams** (shown as **Sync Rules** if using legacy Sync Rules) and paste the contents of [`sync-streams.yaml`](./sync-streams.yaml).

### 3. Install Dependencies

Switch into the demo's directory:
```bash
cd demos/react-supabase-todolist
```

Use [pnpm](https://pnpm.io/installation) to install dependencies:
```bash
pnpm install
```

### 4. Configure Environment Variables

Copy the `.env.local.template` file:
```bash
cp .env.local.template .env.local
```

Edit `.env.local` to insert your Supabase URL, anon key, and PowerSync URL.

### 5. Run the Development Server
```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

## Progressive Web App (PWA)

This demo is PWA compatible, and works fully offline. PWA is not available in development (watch) mode. The manifest and service worker is built using [vite-plugin-pwa](https://vite-pwa-org.netlify.app/).

Build the production codebase:
```bash
pnpm build
```

Run the production server:
```bash
pnpm preview
```

Open a browser on the served URL and install the PWA.

## Learn More

Check out [the PowerSync Web SDK on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/web) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).