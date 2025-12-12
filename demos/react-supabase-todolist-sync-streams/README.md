# Sync streams demo

## Overview

This app is a fork of our [React Supabase Todolist Demo](../react-supabase-todolist/) to add support for sync streams.

Sync streams are not a stable PowerSync feature yet, and most users should probably use the stable demo instead.

To use this demo, deploy the following sync streams:

```yaml
streams:
  lists:
    query: SELECT * FROM lists WHERE owner_id = auth.user_id()
    auto_subscribe: true
  todos:
    query: SELECT * FROM todos WHERE list_id = subscription.parameter('list') AND list_id IN (SELECT id FROM lists WHERE owner_id = auth.user_id())

config:
  edition: 2
```

## Getting Started

Switch into the demo's directory:

```bash
cd demos/react-supabase-todolist-sync-streams
```

Use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
```

Set up the Environment variables: Copy the `.env.local.template` file:

```bash
cp .env.local.template .env.local
```

And then edit `.env.local` to insert your credentials for Supabase.

Run the development server:

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
