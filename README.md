# PowerSync React Native SDK

Monorepo for all things React Native and PowerSync.

## Monorepo Structure

- [packages/powersync-sdk-common](./packages/powersync-sdk-common/README.md)
  - A TypeScript implementation of a PowerSync database connector and streaming sync bucket implementation.

- [packages/powersync-sdk-react-native](./packages/powersync-sdk-react-native/README.md)
  - An extension of `packages/powersync-sdk-common` which provides React Native specific implementations of abstracted features.

- [apps/supabase-todolist](https://github.com/powersync-ja/powersync-supabase-react-native-todolist-demo)
  - An Expo React Native demo app using Supabase.

# Development

## Git Submodules

After cloning this repo be sure to init the Git submodules

```bash
git submodule init && git submodule update
```

This monorepo uses Yarn as it works well with React Native.

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

Development packages can be published by manually triggering the `dev-packages` workflow. Development packages are versioned as `0.0.0-{tag}-DATETIMESTAMP`.

### Production Packages

Pull requests should contain Changesets for changed packages.

Add changesets with

```Bash
yarn changeset add
```

Merging a PR with Changesets will automatically create a PR with version bumps. That PR will be merged when releasing.

## React Native Quick SQLite Development

Testing live development changes to `@journeyapps/react-native-quick-sqlite` will not work with standard `yarn link` commands. Metro does not work well with symlinks <https://github.com/facebook/metro/issues/286>.

The process of releasing development packages for `@journeyapps/react-native-quick-sqlite` for each change can be tedious and slow. A faster (and hackier) method is to use [mtsl](https://www.npmjs.com/package/mtsl) which will watch and copy the package into this workspace's `node_modules`.

```bash
npm install -g mtsl
```

```bash
mtsl add -s "[source path to your react-native-quick-sqlite repo folder]" -d "[this workspaces root node_modules folder]"/@journeyapps/react-native-quick-sqlite
```

```bash
mtsl start "[the id returned from step above]"
```

## Testing Supabase example app

``` bash
cd apps/supabase-todolist
```

Test on either Android or iOS

```bash
yarn ios
```
