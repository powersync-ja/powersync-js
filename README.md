# PowerSync React Native SDK

Monorepo for all things React Native and PowerSync.

## Monorepo Structure

- `apps/supabase-todolist`
    * An Expo React native app using Supabase.

- `packages/powersync-sdk-common`
    * A Typescript implementation of a PowerSync database connector and streaming sync bucket implementation.

- `packages/powersync-sdk-react-native`
    * An extension of `packages/powersync-sdk-common` which provides React Native specific implementations of abstracted features.

- `packages/journeyapps-react-native-quick-sqlite`
    * A Git submodule for a fork of `react-native-quick-sqlite` this module now automatically loads the shared PowerSync Rust SQLite extension.

# Development

## Git Submodules
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


## Versioning


### Development Packages
Development packages can be published by manually triggering the `dev-packages` workflow. Development packages are versioned as `0.0.0-dev.{short-sha}`. 

### Production Packages
Pull requests should contain Changesets for changed packages.

Add changesets with
```Bash
yarn changeset add
```

Submodule production packages should be versioned, tagged and published from their own repository. Any dependencies should be updated here (if applicable) before merging pull requests.


Merging a PR with Changesets will automatically create a PR with version bumps. That PR will be merged when releasing. 

## Testing Supabase example app

``` bash
cd apps/supabase-todolist
```

Test on either Android or iOS
```bash
yarn ios
```

