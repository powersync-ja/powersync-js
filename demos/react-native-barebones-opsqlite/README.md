# PowerSync React Native Barebones OP-SQlite

## Overview

This is a minimal example demonstrating a barebones React Native project using OP-SQLite. It shows an update to the local SQLite DB on app launch.


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

First install pods:
```bash
cd ios
pod install
cd ..
```

Then run the project:
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
