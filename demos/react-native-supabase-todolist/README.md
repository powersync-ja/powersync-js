# PowerSync + Supabase React Native Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for React Native](https://www.npmjs.com/package/@powersync/react-native) together with Supabase.

## Run Demo

Prerequisites:
* To run this demo, you need to have properly configured Supabase and PowerSync projects. Follow the instructions in our Supabase<>PowerSync integration guide:
  * [Configure Supabase](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-supabase)
  * [Configure PowerSync](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-powersync)
* Follow all the steps until, but not including, [Test Everything (Using Our Demo App)](https://docs.powersync.com/integration-guides/supabase-+-powersync#test-everything-using-our-demo-app).

Switch into the demo's directory:

```bash
cd demos/react-native-supabase-todolist
```

Use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
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
