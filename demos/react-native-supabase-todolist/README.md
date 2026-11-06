# PowerSync + Supabase React Native Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@powersync/react-native) together with Supabase.

This demo uses [Sync Streams](https://docs.powersync.com/usage/sync-streams). Both lists and todos are auto-subscribed.

## Run Demo

Prerequisites:
* To run this demo, you need to have properly configured Supabase and PowerSync projects. Follow the instructions in our Supabase<>PowerSync integration guide:
  * [Configure Supabase](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-supabase)
  * [Configure PowerSync](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-powersync)
* Follow all the steps until, but not including, [Test Everything (Using Our Demo App)](https://docs.powersync.com/integration-guides/supabase-+-powersync#test-everything-using-our-demo-app).
* Deploy the following sync streams configuration to your PowerSync instance:

```yaml
config:
  edition: 3

streams:
  user_data:
    queries:
      - SELECT * FROM lists WHERE owner_id = auth.user_id()
      - SELECT todos.* FROM todos INNER JOIN lists ON todos.list_id = lists.id WHERE lists.owner_id = auth.user_id()
    auto_subscribe: true
```

Switch into the demo's directory:

```bash
cd demos/react-native-supabase-todolist
```

Use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
```

Set up the Environment variables: Copy the `.env` file:

```bash
cp .env .env.local
```

And then edit `.env.local` to insert your credentials for Supabase.

Run on iOS

```sh
pnpm ios
```

Run on Android (see [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment?platform=android) to allow you to develop with Android emulators and iOS simulators).

```sh
pnpm android
```

### EAS Build configuration

General information on defining environment variables with Expo can be found here [here](https://docs.expo.dev/build-reference/variables/#can-eas-build-use-env-files).

## Run with Local Supabase and PowerSync

The demo can also run against local Supabase and PowerSync services. You need the [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) and Docker. The services use their own ports (Supabase on 54421, PowerSync on 8280), so they can run next to the other demos. Install dependencies and copy `.env` to `.env.local` as above, then:

1. Start Supabase. It creates the `lists` and `todos` tables from `supabase/migrations`:

   ```bash
   supabase start
   ```

2. In `.env.local`, set the Supabase and PowerSync values to the local services. `.env` lists them under "Local setup". Copy the **Publishable** key from the `supabase start` output into `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

3. Start PowerSync on the Supabase network:

   ```bash
   docker run \
     -p 8280:8280 \
     -e POWERSYNC_CONFIG_B64=$(base64 -i ./powersync.yaml) \
     -e POWERSYNC_SYNC_RULES_B64=$(base64 -i ./sync-config.yaml) \
     --env-file ./.env.local \
     --network supabase_network_react-native-supabase-todolist \
     --name powersync-react-native-todolist journeyapps/powersync-service:latest
   ```

4. On the Android emulator, `localhost` is the emulator itself. Forward both ports first:

   ```bash
   adb reverse tcp:54421 tcp:54421
   adb reverse tcp:8280 tcp:8280
   ```

5. Run the app with `pnpm ios` or `pnpm android`, sign up with any email and password, and open the "Shopping list".

## PowerSync DevTools

The demo includes [PowerSync DevTools](https://docs.powersync.com/tools/devtools-overview) as a [Rozenite](https://www.rozenite.dev/) plugin for React Native DevTools. Run the app with Rozenite enabled:

```sh
WITH_ROZENITE=true pnpm ios
```

Open React Native DevTools (press `j` in the Metro terminal), select **Rozenite**, then **PowerSync** to see the sync status, buckets, streams, local data and logs. Coding agents can use the same data with `npx rozenite agent powersync/diagnostics`.

The setup is in `metro.config.js` and the `usePowerSyncDevTools(db)` call in `app/_layout.tsx`.

## Learn More

Check out [the PowerSync SDK for React Native on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).
