# PowerChat - Demo app for the PowerSync React Native Client SDK

An offline-first group chat app built with Expo/React Native, using Supabase as the backend and PowerSync for offline sync. The following video gives an overview of the implemented functionality:

<https://github.com/journeyapps/powersync-supabase-react-native-group-chat-demo/assets/91166910/f93c484a-437a-44b3-95ab-f5864a99ca1f>

## Local Development (Recommended)

Run the full backend locally with a single command using the Supabase CLI and Docker.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (must be running)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

### Setup

1. Start Supabase and PowerSync:

   ```bash
   pnpm local:up
   ```

   This runs `supabase start` (which applies all migrations from `./supabase/migrations/`) and starts a local PowerSync service container via Docker Compose.

2. The `.env.local` file is pre-configured to point to the local services.

   **Physical device:** Replace `127.0.0.1` in `.env.local` with your Mac's LAN IP address (the same one shown in the Metro bundler URL, e.g. `192.168.x.x`). This is required because `127.0.0.1` on the device refers to the device itself, not your Mac.

3. Start the Expo dev server:

   ```bash
   pnpm dev
   ```

4. To stop everything:

   ```bash
   pnpm local:down
   ```

### Local service URLs

| Service          | URL                        |
| ---------------- | -------------------------- |
| Supabase API     | http://127.0.0.1:54321     |
| Supabase Studio  | http://127.0.0.1:54323     |
| PowerSync        | http://127.0.0.1:8080      |
| Inbucket (email) | http://127.0.0.1:54324     |

## Cloud Setup

To run against cloud-hosted Supabase and PowerSync instances:

1. Deploy a Supabase project using the config and migrations in the [supabase](./supabase) folder. Update `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in [.env.local](./.env.local).

2. Create a PowerSync instance via the [PowerSync dashboard](https://powersync.journeyapps.com/) and connect it to your Supabase project. Copy the sync rules from [sync-rules.yml](./sync-rules.yml) into the dashboard. Update `EXPO_PUBLIC_POWERSYNC_URL` in [.env.local](./.env.local).

## Helpful Links

- [PowerSync Website](https://www.powersync.com/)
- [PowerSync Docs](https://docs.powersync.com/)
- [PowerSync React Native Client SDK Reference](https://docs.powersync.com/client-sdk-references/react-native-and-expo)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)
