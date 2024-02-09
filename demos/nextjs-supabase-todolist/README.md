# PowerSync + Supabase Next.js Demo: Todo List

## Note: Beta Release

This package is currently in a beta release.

## Overview

Demo app demonstrating use of the [PowerSync SDK for Web](https://www.npmjs.com/package/@journeyapps/powersync-sdk-web) together with Supabase.

A step-by-step guide on Supabase<>PowerSync integration is available [here](https://docs.powersync.co/integration-guides/supabase).

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

To learn more about Next.js, take a look at the following resources:

- [Next.js documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

Also check out [the PowerSync Web SDK on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/powersync-sdk-web) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
