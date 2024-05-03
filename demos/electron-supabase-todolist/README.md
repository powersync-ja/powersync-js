# PowerSync + Supabase Electron with rendered Web App Demo: Todo List

## Note: Beta Release

The [web SDK](/packages/web/) is currently in a beta release.

## Overview

Demo app demonstrating use of the [PowerSync SDK for Web](https://www.npmjs.com/package/@powersync/web) together with Supabase and an Electron rendered Web App.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase).

## Getting Started

In the repo directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

Then switch into the demo's directory:

```bash
cd demos/electron-supabase-todolist
```

Set up the Environment variables: Copy the `.env.local.template` file:

```bash
cp .env.local.template .env.local
```

And then edit `.env.local` to insert your credentials for Supabase.

Run the development server:

```bash
pnpm start
```

The Electron app should open automatically.

## Learn More

Check out [the PowerSync Web SDK on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/web) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).
