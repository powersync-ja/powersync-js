<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for React Native

_[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres, MongoDB or MySQL on the server-side._

This package (`packages/react-native`) is the PowerSync SDK for React Native clients. It is an extension of `packages/common`.

See a summary of features [here](https://docs.powersync.co/client-sdk-references/react-native-and-expo).

# Installation

## Install Package

```bash
npx expo install @powersync/react-native
```

## Install Peer Dependency: SQLite

By default, this SDK requires `@journeyapps/react-native-quick-sqlite` as a peer dependency. Alternatively, you can install OP-SQLite from the [PowerSync OP-SQLite package](https://github.com/powersync-ja/powersync-js/tree/main/packages/powersync-op-sqlite) (currently in alpha).

Install it in your app with:

```bash
npx expo install @journeyapps/react-native-quick-sqlite
```

## Install Polyfills

- Polyfills are required for [watched queries](#babel-plugins-watched-queries) using the Async Iterator response format.

### Babel Plugins: Watched Queries

Watched queries can be used with either a callback response or Async Iterator response.

Watched queries using the Async Iterator response format require support for Async Iterators.

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

### Expo EAS config (optional)

If you are using this library in an Expo project and encounter issues with multiple versions of SQLite3, the conflict might be due to `expo-updates` also depending on SQLite. To resolve this, you can configure Expo to use the third-party SQLite pod.

Update your `ios/Podfile.properties.json` to include the following configuration:

```json
{
  "expo.updates.useThirdPartySQLitePod": "true"
}
```

### Metro config (optional)

When using a bare React Native app without a framework like Expo, the `@powersync/react-native` package does not work well with inline requires.

If you see the following error message

```bash
Super expression must either be null or a function
```

then you will need to add this to your `metro.config.js`:

```js
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: {
          blockList: {
            [require.resolve('@powersync/react-native')]: true
          }
        }
      }
    })
  }
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
