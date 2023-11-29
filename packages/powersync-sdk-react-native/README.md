# PowerSync SDK for React Native

[PowerSync](https://powersync.co) is a service and set of SDKs that keeps Postgres databases in sync with on-device SQLite databases. See a summary of features [here](https://docs.powersync.co/client-sdk-references/react-native-and-expo).

# Installation

## Install Package

```bash
npx expo install @journeyapps/powersync-sdk-react-native
```

## Install Peer Dependency: SQLite

This SDK currently requires `@journeyapps/react-native-quick-sqlite` as a peer dependency.

Install it in your app with:

```bash 
npx expo install @journeyapps/react-native-quick-sqlite
```

## Install Polyfills
### Fetch

This SDK requires HTTP streaming in order to function. The following `fetch` polyfills are required for the React Native implementation of `fetch`: 

 - react-native-fetch-api
 - react-native-polyfill-globals
 - react-native-url-polyfill
 - text-encoding
 - web-streams-polyfill

 These are listed as peer dependencies and need to be added to the React Native project

 ```bash 
 npx expo install react-native-fetch-api react-native-polyfill-globals react-native-url-polyfill text-encoding web-streams-polyfill base-64 react-native-get-random-values
 ```

 Enable the polyfills in React Native app with

 ```JavaScript
// App.js
import 'react-native-polyfill-globals/auto';
 ```

### Babel Plugins: Watched Queries

 Watched queries require support for Async Iterators. Expo apps currently require polyfill and Babel plugins in order to use this functionality.

 ```bash
 npx expo install @azure/core-asynciterator-polyfill
 ```

 Make sure to import the polyfill early in your application

 ```JavaScript
// App.js
 import '@azure/core-asynciterator-polyfill';
 ```

Install the async generator Babel plugin

 ```bash
 yarn add -D @babel/plugin-transform-async-generator-functions
 ```

Add the Babel plugin to your `babel.config.js` file

 ```JavaScript
 module.exports = function (api) {
  return {
    presets: [...],
    plugins: [
      // ... Other plugins
      '@babel/plugin-transform-async-generator-functions'
    ]
  };
};
 ```

## Native Projects

This package uses native libraries. Create native Android and iOS projects (if not created already) with

```bash
npx expo run:android
```

# Getting Started

See our [Docs](https://docs.powersync.co/usage/installation/client-side-setup/integrating-with-your-backend#react-native-and-expo) for detailed instructions.

```JavaScript
import {
  Column,
  ColumnType,
  RNQSPowerSyncDatabaseOpenFactory,
  Schema,
  Table
} from '@journeyapps/powersync-sdk-react-native';

export const AppSchema = new Schema([
  new Table({ name: 'customers', columns: [new Column({ name: 'name', type: ColumnType.TEXT })] })
]);

let PowerSync;

export const openDatabase = async () => {
  const PowerSync = new RNQSPowerSyncDatabaseOpenFactory({
    schema: AppSchema,
    dbFilename: 'test.sqlite'
    //location: 'optional location directory to DB file'
  }).getInstance();

  await PowerSync.init();

  // Run local statements.
  await PowerSync.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', ['Fred']);
};

class Connector {
  async fetchCredentials() {
    // TODO logic to fetch a session
    return {
      endpoint: '[The PowerSync instance URL]',
      token: 'An authentication token',
      expiresAt: 'When the token expires',
      userID: 'User ID to associate the session with'
    };
  }

  async uploadData(database) {
    // Upload local changes to backend, see docs for example
  }
}

export const connectPowerSync = async () => {
  const connector = new Connector(); // Which was declared above
  await PowerSync.connect(connector);
};

// Use queries in React Components
export const CustomerListDisplay = () => {
  const customers = usePowerSyncWatchedQuery('SELECT * from customers');

  return (
    <View>
      {customers.map((l) => (
        <Text key={l.id}>{JSON.stringify(l)}</Text>
      ))}
    </View>
  );
};

```

Refer to our [full documentation](https://docs.powersync.co/client-sdk-references/react-native-and-expo) to learn more.

# Known Issues

## Android
The PowerSync connection relies heavily on HTTP streams. React Native does not support streams out of the box, so we use the [polyfills](#polyfills-fetch) mentioned. There is currently an open [issue](https://github.com/facebook/flipper/issues/2495) where the Flipper network plugin does not allow Stream events to fire. This plugin needs to be [disabled](https://stackoverflow.com/questions/69235694/react-native-cant-connect-to-sse-in-android/69235695#69235695) in order for HTTP streams to work.

Uncomment the following from
`android/app/src/debug/java/com/<projectname>/ReactNativeFlipper.java`
```java
      // NetworkFlipperPlugin networkFlipperPlugin = new NetworkFlipperPlugin();
      // NetworkingModule.setCustomClientBuilder(
      //     new NetworkingModule.CustomClientBuilder() {
      //       @Override
      //       public void apply(OkHttpClient.Builder builder) {
      //         builder.addNetworkInterceptor(new FlipperOkhttpInterceptor(networkFlipperPlugin));
      //       }
      //     });
      // client.addPlugin(networkFlipperPlugin);
```

Disable the dev client network inspector
`android/gradle.properties`
```
# Enable network inspector
EX_DEV_CLIENT_NETWORK_INSPECTOR=false
```

## iOS
Testing offline mode on an iOS simulator by disabling the host machine's entire internet connection will cause the device to remain offline even after the internet connection has been restored. This issue seems to affect all network requests in an application.