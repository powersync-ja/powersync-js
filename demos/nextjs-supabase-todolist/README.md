# PowerSync + Supabase Web Demo: Todo List

## Note: Beta Release

This package is currently in a beta release.

## Overview

Demo app demonstrating use of the [PowerSync SDK for Web](https://www.npmjs.com/package/@journeyapps/powersync-sdk-web) together with Supabase.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.com/integration-guides/supabase).

## Getting Started

In your terminal, switch into the demo's directory:

```bash
cd demos/nextjs-supabase-todolist
```

Set up the Environment variables: Copy the `.env.local.template` file:

```bash
cp .env.local.template .env.local
```

And then edit `.env.local` to insert your credentials for Supabase.

Run the development server:

```bash
pnpm watch
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Progressive Web App (PWA)

This demo is PWA compatible. PWA is not available in development (watch) mode.

Build the production codebase

```bash
pnpm build
```

Run the production server

```bash
pnpm start
```

Open a browser on the served URL and install the PWA.

## Learn More

Check out [the PowerSync Web SDK on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/powersync-sdk-web) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).
