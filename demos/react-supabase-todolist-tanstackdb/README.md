# PowerSync + Supabase + TanStack DB Web Demo: Todo List

## Overview

Demo app demonstrating use of the [PowerSync SDK for Web](https://www.npmjs.com/package/@powersync/web) together with Supabase and the PowerSync [TanStackDB](https://tanstack.com/db/latest) integration.

## Run Demo

Prerequisites:

- To run this demo, you need to have properly configured Supabase and PowerSync projects. Follow the instructions in our Supabase<>PowerSync integration guide:
  - [Configure Supabase](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-supabase)
  - [Configure PowerSync](https://docs.powersync.com/integration-guides/supabase-+-powersync#configure-powersync)

Switch into the demo's directory:

```bash
cd demos/react-supabase-todolist-tanstackdb
```

Use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
```

Set up the Environment variables: Copy the `.env.local.template` file:

```bash
cp .env.local.template .env.local
```

And then edit `.env.local` to insert your credentials for Supabase.

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

## Attachments

This demo optionally syncs a photo per list, demonstrating PowerSync attachments with the TanStack DB
integration. It is powered by `TanStackDBAttachmentQueue` from
[`@tanstack/powersync-db-collection`](https://github.com/powersync-ja/tanstack-db/tree/main/packages/powersync-db-collection),
which commits the attachment record and the related list row in a single transaction. See that
package's documentation for the usage guide.

### Enabling attachments

Attachments are **off by default** and the demo downgrades gracefully — lists are created without a photo and no
attachment UI is shown when disabled. To enable them:

1. Create a [Supabase Storage](https://supabase.com/docs/guides/storage) bucket in your Supabase project.
2. Set `VITE_SUPABASE_BUCKET` in `.env.local` to the bucket name.

## Progressive Web App (PWA)

This demo is PWA compatible, and works fully offline. PWA is not available in development (watch) mode. The manifest and service worker is built using [vite-plugin-pwa](https://vite-pwa-org.netlify.app/).

Build the production codebase:

```bash
pnpm build
```

Run the production server:

```bash
pnpm preview
```

Open a browser on the served URL and install the PWA.

## Learn More

Check out [the PowerSync Web SDK on GitHub](https://github.com/powersync-ja/powersync-js/tree/main/packages/web) - your feedback and contributions are welcome!

To learn more about PowerSync, see the [PowerSync docs](https://docs.powersync.com).
