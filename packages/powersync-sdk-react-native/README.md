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
pnpm add -D @babel/plugin-transform-async-generator-functions
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

# Native Projects

This package uses native libraries. Create native Android and iOS projects (if not created already) with

```bash
npx expo run:android
# OR
npx expo run:ios
```

# Learn More

Refer to our [full documentation](https://docs.powersync.com/client-sdk-references/react-native-and-expo) to learn more.
