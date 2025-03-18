# PowerSync + Supabase Todo List App: React Native for Web Demo

## Overview

This demo app is an extension of the [Supabase Todo List App](../react-native-supabase-todolist/) and demonstrates the use of the PowerSync SDKs for [React Native](https://www.npmjs.com/package/@powersync/react-native) and [Web](https://www.npmjs.com/package/@powersync/web) in a [React Native Web](https://necolas.github.io/react-native-web/) project. This configuration allows developers to use one React Native codebase to target mobile and well as web platforms.

To use PowerSync in your own React Native for Web project, additional config is required. This is detailed in our docs [here](https://docs.powersync.com/client-sdk-references/react-native-and-expo/react-native-web-support).

To run this demo, follow these instructions:

## Running this demo

### Install dependencies

In the repo root, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
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

Then deploy the following sync rules:

```yaml
bucket_definitions:
  user_lists:
    # Separate bucket per todo list
    parameters: select id as list_id from lists where owner_id = request.user_id()
    data:
      - select * from lists where id = bucket.list_id
      - select * from todos where list_id = bucket.list_id
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
