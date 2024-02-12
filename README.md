<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/19345049/602bafa0-41ce-4cee-a432-56848c278722"/></a>
</p>

PowerSync is a service and set of SDKs that keeps Postgres databases in sync with on-device SQLite databases.

# PowerSync JavaScript SDKs

`powersync-js` is the monorepo for PowerSync JavaScript SDKs.

## Monorepo Structure: Packages

- [packages/powersync-sdk-react-native](./packages/powersync-sdk-react-native/README.md)

  - React Native SDK implementation (extension of `packages/powersync-sdk-common`)

- [packages/powersync-sdk-web](./packages/powersync-sdk-web/README.md)

  - JS Web SDK implementation (extension of `packages/powersync-sdk-common`)

- [packages/powersync-react](./packages/powersync-react/README.md)

  - React integration for PowerSync.

- [packages/powersync-attachments](./packages/powersync-attachments/README.md)

  - Attachments helper package for React Native.

- [packages/powersync-sdk-common](./packages/powersync-sdk-common/README.md)
  - Shared package: TypeScript implementation of a PowerSync database connector and streaming sync bucket implementation.

## Demo Apps / Example Projects

Demo applications are located in the [`demos/`](./demos/) directory.

- [demos/nextjs-supabase-todolist](./demos/nextjs-supabase-todolist/): A Next.js to-do list example app using the PowerSync Web SDK and a Supabase backend.
- [demos/yjs-nextjs-supabase-text-collab](./demos/yjs-nextjs-supabase-text-collab/README.md): A Next.js real-time text editing collaboration example app powered by [Yjs](https://github.com/yjs/yjs) CRDTs and [Tiptap](https://tiptap.dev/), using the PowerSync Web SDK and a Supabase backend.
- [demos/react-native-supabase-todolist](./demos/react-native-supabase-todolist): A React Native to-do list example app using a Supabase backend.
- [demos/angular-supabase-todolist](./demos/angular-supabase-todolist/README.md) An Angular to-do list example app using the PowerSync Web SDK and a Supabase backend.
- [demos/example-webpack](./demos/example-webpack/README.md): A minimal example demonstrating bundling with Webpack.
- [demos/example-vite](./demos/example-vite/README.md): A minimal example demonstrating bundling with Vite.

# Development

This monorepo uses pnpm.

Install workspace dependencies

```bash
pnpm install
```

Build packages

```bash
pnpm build:packages
```

## Versioning

### Development Packages

Development packages can be published by manually triggering the `dev-packages` workflow. Development packages are versioned as `0.0.0-{tag}-DATETIMESTAMP`.

### Production Packages

Pull requests should contain Changesets for changed packages.

Add changesets with

```Bash
pnpm changeset add
```

Merging a PR with Changesets will automatically create a PR with version bumps. That PR will be merged when releasing.

## React Native Quick SQLite Development

The PowerSync React Native SDK uses [a fork of react-native-quick-sqlite](https://github.com/powersync-ja/react-native-quick-sqlite)

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
