# PowerSync + Supabase React Native Web Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@powersync/react-native) together with Supabase in a React Native Web project.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase).

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
    parameters: select id as list_id from lists where owner_id = request.user_id()
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

## Adding React Native Web Support

To ensure that `PowerSync` features are fully supported in your `React Native Web` project, follow these steps. This documentation covers necessary configurations, setup, and multi-platform implementation.

### Known limitations

Currently `React Native Web` is only supported when `enableMultiTabs` is true.

### 1. Configuring the workers

#### 1.1 Recommended `workers`

With `React Native Web` the workers need to be configured when instantiating `PowerSyncDatabase`, refer to the example [here](./library/powersync/system.ts). It is recommended to configure the worker options to the provided workers under `/node_modules/@powersync/web/dist/`. If this doesn't work out of the box, try the next section [Copying `dist` and custom `workers` locations](#12-copying-dist-and-custom-workers-locations).

The following example shows how to configure the DB worker and the sync worker:

```javascript
const factory = new WASQLiteOpenFactory({
  dbFilename: 'sqlite.db',
  // You can specify a path to the db worker
  worker: '/node_modules/@powersync/web/dist/worker_WASQLiteDB.umd.js'

  // Or provide factory function to create the worker
  // worker: () =>
  //   new SharedWorker(`/node_modules/@powersync/web/dist/worker_WASQLiteDB.umd.js`, {
  //     name: `shared-DB-worker-sqlite.db`
  //   }).port
});

const powersync = new PowerSyncDatabaseWeb({
  schema: AppSchema,
  database: factory,
  sync: {
    // You can specify a path to the sync worker
    worker: '/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js'

    // Or provide factory function to create the worker
    // worker: () =>
    //   new SharedWorker('/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js', {
    //     name: `shared-sync-sqlite.db`
    //   }).port,
  }
});
```

#### 1.2 Copying `dist` and custom `workers` locations

You can copy the contents of the `dist` directory to somewhere else like `./public`, in which case configure the `workers` accordingly:

```javascript
const factory = new WASQLiteOpenFactory({
  dbFilename: 'sqlite.db',
  worker: '/node_modules/@powersync/web/dist/worker_WASQLiteDB.umd.js'
});

this.powersync = new PowerSyncDatabaseWeb({
  schema: AppSchema,
  database: factory,
  sync: {
    worker: '/public/worker_SharedSyncImplementation.umd.js'
  }
});
```

A helper script is available [here](./copy-files.js) to automate the copying process. It will copy the contents to `./public`.
It can be run with:

```
node copy-files.js
```

### 2. Multi-platform support

A common use case for `React Native Web` is to have a single `react-native` project that targets both mobile and web platforms. To support this setup, you need to adjust the Metro configuration and handle platform-specific libraries accordingly.

#### Metro config

Refer to the example [here](./metro.config.js).
Setting `config.resolver.resolveRequest` allows Metro to behave differently based on the platform.

```javascript
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Depending on `@powersync/web` for functionality, ignore mobile specific dependencies.
    if (['react-native-prompt-android', '@powersync/react-native'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
    const mapping = { 'react-native': 'react-native-web', '@powersync/web': '@powersync/web/dist/index.umd.js' };
    if (mapping[moduleName]) {
      console.log('remapping', moduleName);
      return context.resolveRequest(context, mapping[moduleName], platform);
    }
  } else {
    // Depending on `@powersync/react-native` for functionality, ignore `@powersync/web` dependencies.
    if (['@powersync/web'].includes(moduleName)) {
      return {
        type: 'empty'
      };
    }
  }

  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};
```

#### Implementations

Many `React-native` and `web` packages are implemented with only their specific platform in mind, as such there may be times where you will need to evaluate the platform and provide alternative implementations.

##### Instantiating PowerSync

The following snippet constructs the correct PowerSync database depending on the platform that the code is executing on.

```javascript
import React from 'react';
import { PowerSyncDatabase as PowerSyncDatabaseNative } from '@powersync/react-native';
import { PowerSyncDatabase as PowerSyncDatabaseWeb } from '@powersync/web';

if (PowerSyncDatabaseNative) {
  this.powersync = new PowerSyncDatabaseNative({
    schema: AppSchema,
    database: {
      dbFilename: 'sqlite.db'
    }
  });
} else {
  const factory = new WASQLiteOpenFactory({
    dbFilename: 'sqlite.db',
    worker: '/node_modules/@powersync/web/dist/worker_WASQLiteDB.umd.js'
  });

  this.powersync = new PowerSyncDatabaseWeb({
    schema: AppSchema,
    database: factory,
    sync: {
      worker: '/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js'
    }
  });
}
```

##### Implementations that don't support both mobile and web

```javascript
import { Platform } from 'react-native';

import { Platform } from 'react-native';
import rnPrompt from 'react-native-prompt-android';

// Example conditional implementation
export async function prompt(
    title = '',
  description = '',
  onInput = (_input: string | null): void | Promise<void> => {},
  options: { placeholder: string | undefined } = { placeholder: undefined }
) {
  const isWeb = Platform.OS === 'web';
  let name: string | null = null;

  if (isWeb) {
    name = window.prompt(`${title}\n${description}`, options.placeholder);
  } else {
    name = await new Promise((resolve) => {
      rnPrompt(
        title,
        description,
        (input) => {
          resolve(input);
        },
        { placeholder: options.placeholder, style: 'shimo' }
      );
    });
  }

  await onInput(name);
}

```

Which can then be used agnostically in a component.

```jsx
import { Button } from 'react-native';
import { prompt } from 'util/prompt';

<Button
  title="Add"
  onPress={() => {
    prompt(
      'Add a new Todo',
      '',
      (text) => {
        if (!text) {
          return;
        }

        return createNewTodo(text);
      },
      { placeholder: 'Todo description' }
    );
  }}
/>;
```

### 3. TypeScript Configuration to allow UMD imports

A `UMD` version of `@powersync/web` is available at `@powersync/web/umd`.
To support the version, two changes are required to the project.

1. Add `config.resolver.unstable_enablePackageExports = true;` to your `metro.config.js` file.
2. In the `tsconfig.json` file specify the `moduleResolution` to be `Bundler`.

```json
 "compilerOptions": {
    "moduleResolution": "Bundler"
  }
```

## Run the App

Install the dependencies, including the React Native SDK:

```sh
pnpm i
```

Run on Web

```sh
pnpm web
```

Run on iOS

```sh
pnpm ios
```

Run on Android

```sh
pnpm android
```

## Here are some helpful links

- [PowerSync Website](https://www.powersync.com/)
- [PowerSync Docs](https://docs.powersync.com/)
- [PowerSync React Native Client SDK Reference](https://docs.powersync.com/client-sdk-references/react-native-and-expo)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)
