<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/19345049/602bafa0-41ce-4cee-a432-56848c278722"/></a>
</p>

# PowerSync SDK for React Native

[PowerSync](https://powersync.com) is a service and set of SDKs that keeps Postgres databases in sync with on-device SQLite databases.

This package (`packages/powersync-sdk-react-native`) is the PowerSync SDK for React Native clients. It is an extension of `packages/powersync-sdk-common`.

See a summary of features [here](https://docs.powersync.co/client-sdk-references/react-native-and-expo).

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

This SDK can connect to a PowerSync instance via HTTP streams or Web sockets. Different polyfill configurations are required for each method.

### React Native Common Polyfills

This package requires polyfills for HTTP streaming and other text encoding functions. These functions can be provided with [react-native-polyfill-globals](https://www.npmjs.com/package/react-native-polyfill-globals).

Install the collection of polyfills with:

```bash
npx expo install react-native-polyfill-globals
```

The `react-native-polyfill-globals` package includes peer dependencies for individual functions. Most modern package managers install peer dependencies by default. If peer dependencies are explicitly installed, install them manually with:

```bash
npx expo install react-native-fetch-api react-native-polyfill-globals react-native-url-polyfill text-encoding web-streams-polyfill base-64 react-native-get-random-values
```

Enable the polyfills in React Native app by adding the following in your top level entry point

```JavaScript
// App.js
import 'react-native-polyfill-globals/auto';
```

### Random Values

This packages uses the `uuid` library for generating UUIDs. This requires `crypto.getRandomValues` to be available. 

Install [react-native-get-random-values](https://github.com/LinusU/react-native-get-random-values)

```bash
npx expo install react-native-get-random-values
```

Import the polyfill in our app entry point

```javascript
import 'react-native-get-random-values'
```

### Web sockets

Our web socket implementation supports binary payloads which are encoded as BSON documents.

This requires support for the `Buffer` interface.

Apply the `Buffer` polyfill

```bash
npx expo install @craftzdog/react-native-buffer
```

```javascript
import { Buffer } from '@craftzdog/react-native-buffer';

if (typeof global.Buffer == 'undefined') {
  // @ts-ignore If using TypeScript
  global.Buffer = Buffer;
}
```

This library uses `RSocket` for reactive web socket streams which requires `process.nextTick` to be available. Apply a polyfill if not available.

```javascript
if (typeof process.nextTick == 'undefined') {
  process.nextTick = setImmediate;
}
```

### Babel Plugins: Watched Queries

Watched queries can be used with either a callback response or Async Iterator response. 

Watched queries using the async iterator response format require support for Async Iterators. 

Expo apps currently require polyfill and Babel plugins in order to use this functionality.

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

This package uses native libraries. Create native Android and iOS projects (if not created already) by running:

```bash
npx expo run:android
# OR
npx expo run:ios
```

# Getting Started

Our [SDK reference](https://docs.powersync.com/client-sdk-references/react-native-and-expo) contains everything you need to know to get started implementing PowerSync in your project.

# Changelog

A changelog for this SDK is available [here](https://releases.powersync.com/announcements/react-native-client-sdk).

# API Reference

The full API reference for this SDK can be found [here](https://powersync-ja.github.io/powersync-js/react-native-sdk).

# Examples

For example projects built with PowerSync and React Native, see our [Demo Apps / Example Projects](https://docs.powersync.com/resources/demo-apps-example-projects#react-native-and-expo) gallery. Most of these projects can also be found in the [`demos/`](../demos/) directory.

# Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) where you can browse topics from our community, ask questions, share feedback, or just say hello :)
- Please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) when you come across a bug.
- Have feedback or an idea? [Submit an idea](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) via our public roadmap or [schedule a chat](https://calendly.com/powersync-product/powersync-chat) with someone from our product team.
