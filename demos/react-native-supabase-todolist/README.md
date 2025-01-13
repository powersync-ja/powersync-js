# PowerSync + Supabase React Native Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@powersync/react-native) together with Supabase.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase-+-powersync).
Follow all the steps until, but not including, [Test Everything (Using Our Demo App)](https://docs.powersync.com/integration-guides/supabase-+-powersync#test-everything-using-our-demo-app).

## Getting Started

In the repo directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

Then switch into the demo's directory:

```bash
cd demos/react-native-supabase-todolist
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

## Learn More

Check out [the PowerSync SDK for React Native on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).
