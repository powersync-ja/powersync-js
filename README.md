<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

*[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres, MongoDB or MySQL on the server-side.*

# PowerSync JavaScript SDKs

`powersync-js` is the monorepo for PowerSync JavaScript SDKs.

## Monorepo Structure: Packages

- [packages/react-native](./packages/react-native/README.md)

  - React Native SDK implementation (extension of `packages/common`)

- [packages/web](./packages/web/README.md)

  - JS Web SDK implementation (extension of `packages/common`)

- [packages/react](./packages/react/README.md)

  - React integration for PowerSync.

- [packages/vue](./packages/vue/README.md)

  - Vue composables for PowerSync.

- [packages/tanstack-query](./packages/tanstack-query/README.md)

  - Tanstack Query integration for React.

- [packages/attachments](./packages/attachments/README.md)

  - Attachments helper package for React Native and JavaScript/TypeScript projects.

- [packages/kysely-driver](./packages/kysely-driver/README.md)

  - Kysely integration (ORM) for React Native and JavaScript/TypeScript projects.

- [packages/drizzle-driver](./packages/drizzle-driver/README.md)

  - Drizzle integration (ORM) for React Native and JavaScript/TypeScript projects.

- [packages/powersync-op-sqlite](./packages/powersync-op-sqlite/README.md)

  - OP-SQLite integration for React Native projects.

- [packages/common](./packages/common/README.md)
  - Shared package: TypeScript implementation of a PowerSync database connector and streaming sync bucket implementation.

## Demo Apps / Example Projects

Demo applications are located in the [`demos/`](./demos/) directory. Also see our [Demo Apps / Example Projects](https://docs.powersync.com/resources/demo-apps-example-projects) gallery which lists all projects by the backend and client-side framework they use.

### React Native

- [demos/react-native-supabase-todolist](./demos/react-native-supabase-todolist/README.md): A React Native to-do list example app using a Supabase backend.
- [demos/react-native-supabase-group-chat](./demos/react-native-supabase-group-chat/README.md): A React Native group chat example app using a Supabase backend.
- [demos/react-native-web-supabase-todolist](./demos/react-native-web-supabase-todolist/README.md) A React Native to-do list example app using a Supabase backend that's compatible with React Native for Web.
- [demos/django-react-native-todolist](./demos/django-react-native-todolist/README.md) A React Native to-do list example app using a Django backend.

### Web

- [demos/react-supabase-todolist](./demos/react-supabase-todolist/README.md): A React to-do list example app using the PowerSync Web SDK and a Supabase backend.
- [demos/react-multi-client](./demos/react-multi-client/README.md): A React widget that illustrates how data flows from one PowerSync client to another.
- [demos/yjs-react-supabase-text-collab](./demos/yjs-react-supabase-text-collab/README.md): A React real-time text editing collaboration example app powered by [Yjs](https://github.com/yjs/yjs) CRDTs and [Tiptap](https://tiptap.dev/), using the PowerSync Web SDK and a Supabase backend.
- [demos/vue-supabase-todolist](./demos/vue-supabase-todolist/README.md): A Vue to-do list example app using the PowerSync Web SDK and a Supabase backend.
- [demos/angular-supabase-todolist](./demos/angular-supabase-todolist/README.md) An Angular to-do list example app using the PowerSync Web SDK and a Supabase backend.

- [demos/example-webpack](./demos/example-webpack/README.md): A minimal example demonstrating bundling with Webpack.
- [demos/example-vite](./demos/example-vite/README.md): A minimal example demonstrating bundling with Vite.
- [demos/example-nextjs](./demos/example-nextjs/README.md): An example demonstrating setup with Next.js.

### Electron

- [demos/example-electron](./demos/example-electron/README.md) An Electron example web rendered app using the PowerSync Web SDK.

### Capacitor

- [demos/example-capacitor](./demos/example-capacitor/README.md) A Capacitor example app using the PowerSync Web SDK.

## Tools

- [tools/diagnostics-app](./tools/diagnostics-app): A standalone web app that presents stats about a user's local database (incl. tables and sync buckets).

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
