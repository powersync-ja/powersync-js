# PowerSync React Native Barebones OPSQlite

## Overview

This is a minimal example demonstrating a barebones react native project using OPSQLite . It shows an update to the local SQLite DB on app launch.


## Getting Started

In the repo directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

Then switch into the demo's directory:

```bash
cd demos/react-native-barebones-opsqlite
```

Run the development server:

For iOS:
```bash
pnpm start
pnpm ios
```

For Android:
```bash
pnpm start
pnpm android
```

Then press `d` to open dev tools where you will see the console output showing the local SQLite DB insert.
