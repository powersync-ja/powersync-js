# PowerSync React Native SDK

Monorepo for all things React Native and PowerSync.

## Monorepo structure

- `apps/supabase-todolist`
    * An Expo React native app using Supabase.

- `packages/powersync-sdk-common`
    * A Typescript implementation of a PowerSync database connector and streaming sync bucket implementation.

- `packages/powersync-sdk-react-native`
    * An extension of `packages/powersync-sdk-common` which provides React Native specific implementations of abstracted features.

- `packages/journeyapps-react-native-quick-sqlite`
    * A Git submodule for a fork of `react-native-quick-sqlite` this module now automatically loads the shared PowerSync Rust SQLite extension.

# Development

## Git submodules
After cloning this repo be sure to init the Git submodules

```bash
git submodule init && git submodule update
```

This monorepo uses Yarn as it works well with React native.

Install workspace dependencies
```bash
yarn install
```

Build packages
```bash
yarn build:packages
```

## Testing Supabase example app

``` bash
cd apps/example
```

Test on either Android or iOS
```bash
yarn ios
```

