# PowerSync + Supabase React Native Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@journeyapps/powersync-sdk-react-native) together with Supabase.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase).

![docs-react-native-supabase-powersync-setup](https://github.com/journeyapps/powersync-supabase-react-native-todolist-demo/assets/277659/923dc9a2-6a0e-4ce4-934d-29e3ab8b0f09)

## Set up Supabase Project

Create a new Supabase project, and paste and run the contents of [database.sql](./database.sql) in the Supabase SQL editor.

It does the following:

1. Create `lists` and `todos` tables.
2. Create a publication called `powersync` for `lists` and `todos`.
3. Enable row level security and storage policies, allowing users to only view and edit their own data.
4. Create a trigger to populate some sample data when a user registers.

## Set up PowerSync Instance

Create a new PowerSync instance, connecting to the database of the Supabase project (find detailed instructions in the [Supabase<>PowerSync integration guide](https://docs.powersync.com/integration-guides/supabase)).

Then deploy the following sync rules:

```yaml
bucket_definitions:
  user_lists:
    # Separate bucket per todo list
    parameters: select id as list_id from lists where owner_id = token_parameters.user_id
    data:
      - select * from lists where id = bucket.list_id
      - select * from todos where list_id = bucket.list_id
```

## Configure The App
Replace the necessary credentials in the [.env](./.env) file.
Generally, the `.env` file is used for storing common environment variables shared across all instances of the application, while `.env.local` is for overriding or providing environment-specific configurations, particularly for local development.
As `.env.local` is normally not checked into source control (this project has a git-ignore rule), you can copy `.env`, name it `.env.local`, and then configure as needed.

### EAS Build configuration
Take note that you will need an [Expo](https://expo.dev/) account if you want to use EAS for your builds. The Expo project ID should then also be configured in the environment file.

For secret/sensitive environment variables which shouldn't be checked into source control, you can configure them as EAS secrets. They can be added via either the Expo website or the EAS CLI, both are explained [here](https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables).

General information on defining environment variables with Expo can be found here [here](https://docs.expo.dev/build-reference/variables/#can-eas-build-use-env-files).

## Run the App

Install the dependencies, including the React Native SDK:

```sh
pnpm i
```

Run on iOS

```sh
pnpm ios
```

Run on Android

```sh
pnpm android
```


## Here are some helpful links:

- [PowerSync Website](https://www.powersync.com/)
- [PowerSync Docs](https://docs.powersync.com/)
- [PowerSync React Native Client SDK Reference](https://docs.powersync.com/client-sdk-references/react-native-and-expo)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)