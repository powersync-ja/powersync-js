# PowerSync + Supabase Web Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for Web](https://www.npmjs.com/package/@powersync/web) together with Supabase.

This demo uses [Sync Streams](https://docs.powersync.com/usage/sync-streams). Both lists and todos are auto-subscribed.

## Run Demo

Switch into the demo's directory and install dependencies with [pnpm](https://pnpm.io/installation):

```bash
cd demos/react-supabase-todolist
pnpm install
```

Copy the environment template:

```bash
cp .env.local.template .env.local
```

### Local Supabase and PowerSync

The demo can run against local Supabase and PowerSync services. You need the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) and Docker.

1. Start Supabase. It creates the `lists` and `todos` tables from `supabase/migrations`:

   ```bash
   supabase start
   ```

2. Copy the **Publishable** key from the `supabase start` output into `VITE_SUPABASE_ANON_KEY` in `.env.local`.

3. Start PowerSync on the Supabase network:

   ```bash
   docker run \
     -p 8080:8080 \
     -e POWERSYNC_CONFIG_B64=$(base64 -i ./powersync.yaml) \
     -e POWERSYNC_SYNC_RULES_B64=$(base64 -i ./sync-config.yaml) \
     --env-file ./.env.local \
     --network supabase_network_react-supabase-todolist \
     --name powersync-react-todolist journeyapps/powersync-service:latest
   ```

4. Run the development server:

   ```bash
   pnpm dev
   ```

Open [http://localhost:5173](http://localhost:5173), sign up with any email and password, and create a list.

### Hosted Supabase and PowerSync

To use hosted projects instead, follow the Supabase<>PowerSync integration guide:

* [Configure Supabase](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-supabase)
* [Configure PowerSync](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-powersync)

Then set the `VITE_` values in `.env.local` to your project details and run `pnpm dev`.

## PowerSync DevTools

The development server includes [PowerSync DevTools](https://docs.powersync.com/tools/devtools/vite). Open the Vite DevTools dock at the bottom of the page and select **PowerSync** to see the sync status, buckets, streams, local data and logs. The first time, confirm the browser with the code that the terminal prints.

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
