# PowerChat - Demo app for the PowerSync React Native Client SDK

An offline-first group chat app built with Expo/React Native, using Supabase as the backend and PowerSync for offline sync.

This demo uses [Sync Streams](https://docs.powersync.com/usage/sync-streams) (edition 3) instead of classic sync rules. User data (profile, contacts, groups, memberships, DM messages) is auto-subscribed, while group messages are subscribed on-demand when a user opens a specific group chat and unsubscribed when navigating away.

The following video gives an overview of the implemented functionality:

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

2. Create a PowerSync instance via the [PowerSync dashboard](https://powersync.journeyapps.com/) and connect it to your Supabase project. Deploy the following sync streams configuration (also available in [sync-rules.yml](./sync-rules.yml)):

   ```yaml
   config:
     edition: 3

   streams:
     user:
       auto_subscribe: true
       queries:
         - SELECT * FROM profiles WHERE id = auth.user_id()
         - SELECT * FROM contacts WHERE owner_id = auth.user_id()
         - SELECT * FROM memberships WHERE profile_id = auth.user_id()
         - SELECT * FROM groups WHERE owner_id = auth.user_id()
         - SELECT * FROM messages WHERE sender_id = auth.user_id()
         - SELECT * FROM messages WHERE recipient_id = auth.user_id() AND sent_at IS NOT NULL
         - SELECT *, '...' as content FROM messages WHERE recipient_id = auth.user_id() AND sent_at IS NULL

     contact_profiles:
       auto_subscribe: true
       query: |
         SELECT profiles.* FROM profiles
           JOIN contacts ON contacts.profile_id = profiles.id
         WHERE contacts.owner_id = auth.user_id()

     member_groups:
       auto_subscribe: true
       query: |
         SELECT groups.* FROM groups
           JOIN memberships ON memberships.group_id = groups.id
         WHERE memberships.profile_id = auth.user_id()

     chats:
       auto_subscribe: true
       queries:
         - SELECT profiles.id, profiles.id as profile_id FROM profiles
             JOIN messages ON messages.recipient_id = profiles.id
           WHERE messages.sender_id = auth.user_id()
         - SELECT profiles.id, profiles.id as profile_id FROM profiles
             JOIN messages ON messages.sender_id = profiles.id
           WHERE messages.recipient_id = auth.user_id()

     chat_profiles:
       auto_subscribe: true
       queries:
         - SELECT profiles.* FROM profiles
             JOIN messages ON messages.recipient_id = profiles.id
           WHERE messages.sender_id = auth.user_id()
         - SELECT profiles.* FROM profiles
             JOIN messages ON messages.sender_id = profiles.id
           WHERE messages.recipient_id = auth.user_id()

     group_messages:
       queries:
         - SELECT * FROM messages WHERE group_id = subscription.parameter('group_id') AND sent_at IS NOT NULL
         - SELECT * FROM messages WHERE group_id = subscription.parameter('group_id') AND sender_id = auth.user_id() AND sent_at IS NULL

     group_memberships:
       query: SELECT * FROM memberships WHERE group_id = subscription.parameter('group_id')

     group_member_profiles:
       query: |
         SELECT profiles.* FROM profiles
           JOIN memberships ON memberships.profile_id = profiles.id
         WHERE memberships.group_id = subscription.parameter('group_id')
   ```

   Update `EXPO_PUBLIC_POWERSYNC_URL` in [.env.local](./.env.local).

## Helpful Links

- [PowerSync Website](https://www.powersync.com/)
- [PowerSync Docs](https://docs.powersync.com/)
- [PowerSync React Native Client SDK Reference](https://docs.powersync.com/client-sdk-references/react-native-and-expo)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)
