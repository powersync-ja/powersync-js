# Adding React Native Web Support

To ensure that `PowerSync` features are fully supported in your `React Native Web` project, follow these steps. This documentation covers necessary configurations, setup, and multi-platform implementation.

## Known limitations

Currently `React Native Web` is only supported when `enableMultiTabs` is true.

## 1. Configuring the workers

### 1.1 Recommended `workers`

With `React Native Web` path to the workers should be configured when instantiating a database factory for `PowerSyncDatabase`, refer to the example [here](./library/powersync/system.ts). It is recommended to configure the workers to point to `/node_modules/@powersync/web/dist/`. If this doesn't work out of the box, try the next section [Copying `dist` and custom `workers` locations](#12-copying-dist-and-custom-workers-locations).

```javascript
const factory = new WASQLiteOpenFactory({
  dbFilename: 'sqlite.db',
  // You can specify paths to the workers
  sharedSyncWorker: '/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js',
  wasqliteDBWorker: '/node_modules/@powersync/web/dist/worker_SharedWASQLiteDB.umd.js'

  // Or provide factory functions to create the workers
  // sharedSyncWorker: () =>
  //   new SharedWorker('/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js', {
  //     name: `shared-sync-sqlite.db`
  //   }),
  // wasqliteDBWorker: () =>
  //   new SharedWorker(`/node_modules/@powersync/web/dist/worker_SharedWASQLiteDB.umd.js`, {
  //     name: `shared-DB-worker-sqlite.db`
  //   })
});

const powersync = new PowerSyncDatabaseWeb({
  schema: AppSchema,
  database: factory
});
```

### 1.2 Copying `dist` and custom `workers` locations

You can copy the contents of the `dist` directory to somewhere else like `./public`, in which case configure the `workers` accordingly:

```javascript
const factory = new WASQLiteOpenFactory({
  dbFilename: 'sqlite.db',

  // You can specify paths to the workers
  sharedSyncWorker: '/public/worker_SharedSyncImplementation.umd.js',
  wasqliteDBWorker: '/public/worker_SharedWASQLiteDB.umd.js'
});
```

A helper script is available [here](./copy-files.js) to automate the copying process. It will copy the contents to `./public`.
It can be run with:

```
node copy-files.js
```

## 2. Multi-platform support

A common use case for `React Native Web` is to have a single `react-native` project that targets both mobile and web platforms. To support this setup, you need to adjust the Metro configuration and handle platform-specific libraries accordingly.

### Metro config

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

### Implementations

Many `React-native` and `web` packages are implemented with only their specific platform in mind, as such there may be times where you will need to evaluate the platform and provide alternative implementations.

#### Instantiating PowerSync

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
    sharedSyncWorker: '/node_modules/@powersync/web/dist/worker_SharedSyncImplementation.umd.js',
    wasqliteDBWorker: '/node_modules/@powersync/web/dist/worker_SharedWASQLiteDB.umd.js'
  });

  this.powersync = new PowerSyncDatabaseWeb({
    schema: AppSchema,
    database: factory
  });
}
```

#### Implementations that don't support both mobile and web

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

## 3. TypeScript Configuration to allow UMD imports

A `UMD` version of `@powersync/web` is available at `@powersync/web/umd`.
To support the version, two changes are required to the project.

1. Add `config.resolver.unstable_enablePackageExports = true;` to your `metro.config.js` file.
2. In the `tsconfig.json` file specify the `moduleResolution` to be `Bundler`.

```json
 "compilerOptions": {
    "moduleResolution": "Bundler"
  }
```
