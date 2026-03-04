# PowerSync + Supabase Todo List App: React Native for Web Demo

## Overview

This demo app is an extension of the [Supabase Todo List App](../react-native-supabase-todolist/) and demonstrates the use of the PowerSync SDKs for [React Native](https://www.npmjs.com/package/@powersync/react-native) and [Web](https://www.npmjs.com/package/@powersync/web) in a [React Native Web](https://necolas.github.io/react-native-web/) project. This configuration allows developers to use one React Native codebase to target mobile and well as web platforms.

This demo uses [Sync Streams](https://docs.powersync.com/usage/sync-streams) (edition 3) instead of classic sync rules. Lists are auto-subscribed, while todos are subscribed on-demand when a user opens a specific list and unsubscribed when navigating away.

To use PowerSync in your own React Native for Web project, additional config is required. This is detailed in our docs [here](https://docs.powersync.com/client-sdk-references/react-native-and-expo/react-native-web-support).

## Run Demo

Prerequisites:
* To run this demo, you need to have properly configured Supabase and PowerSync projects. Follow the instructions in our Supabase<>PowerSync integration guide:
  * [Configure Supabase](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-supabase)
  * [Configure PowerSync](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-powersync)

### Install dependencies

Switch into the demo's directory:

```bash
cd demos/react-native-web-supabase-todolist
```

Use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
```

### Set up Supabase Project

Detailed instructions for integrating PowerSync with Supabase can be found in the [integration guide](https://docs.powersync.com/integration-guides/supabase-+-powersync). Below are the main steps required to get this demo running.

Create a new Supabase project, and paste and run the contents of [database.sql](./database.sql) in the Supabase SQL editor.

It does the following:

1. Create `lists` and `todos` tables.
2. Create a publication called `powersync` for `lists` and `todos`.
3. Enable row level security and storage policies, allowing users to only view and edit their own data.
4. Create a trigger to populate some sample data when a user registers.

### Set up PowerSync Instance

Create a new PowerSync instance, connecting to the database of the Supabase project. See instructions [here](https://docs.powersync.com/integration-guides/supabase-+-powersync#connect-powersync-to-your-supabase).

Then deploy the following sync streams configuration:

```yaml
config:
  edition: 3

streams:
  lists:
    query: SELECT _id as id, * FROM lists
    auto_subscribe: true

  todos:
    query: SELECT _id as id, * FROM todos WHERE list_id = subscription.parameter('list_id')
```

### Configure the app

#### 1. Set up environment variables:

Copy the `.env.local.template` file:

```bash
cp .env.local.template .env.local
```

Then edit `.env.local` to insert your Supabase and PowerSync project credentials.

#### 2. Configure web workers

This is required for the React Native Web implementation. Learn more in [our docs](https://docs.powersync.com/client-sdk-references/react-native-and-expo/react-native-web-support).

```bash
pnpm powersync-web copy-assets
```

### Run the app

Run on Web:

```sh
pnpm web
```

Web bundling can take a few seconds.

Run on iOS:

```sh
pnpm ios
```

Run on Android:

```sh
pnpm android
```
