# PowerSync + Supabase Nuxt Demo: Todo List

This is a demo application showcasing PowerSync integration with Nuxt 4 and Supabase. It demonstrates real-time data synchronization for a simple todo list application using PowerSync's official Nuxt module.

## Setup Instructions

Note that this setup guide has minor deviations from the [Supabase + PowerSync integration guide](https://docs.powersync.com/integration-guides/supabase-+-powersync). Below we refer to sections in this guide where relevant.

### 1. Install dependencies

In the repo root directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

### 2. Create project on Supabase and set up Postgres

This demo app uses Supabase as its Postgres database and backend:

1. [Create a new project on the Supabase dashboard](https://supabase.com/dashboard/projects).
2. Go to the Supabase SQL Editor for your new project and execute the SQL statements in [`db/seed.sql`](db/seed.sql) to create the database schema, PowerSync replication role, and publication needed for PowerSync.

**Note:** Before executing the SQL, make sure to update the `powersync_role` password in `db/seed.sql` (currently set to `'postgres_12345'`) to a secure password of your choice.

**Important:** When connecting PowerSync to your Supabase database, you'll use the `powersync_role` credentials instead of the default Supabase connection string. This role has the necessary replication privileges and bypasses Row Level Security (RLS).

### 3. Auth setup

This app uses Supabase's email/password authentication. 

1. Go to "Authentication" -> "Providers" in your Supabase dashboard
2. Ensure "Email" provider is enabled
3. You can disable email confirmation for development by going to "Authentication" -> "Email Auth" and disabling "Confirm email"

You'll need to create a user account when you first access the application.

### 4. Set up PowerSync

You can use either PowerSync Cloud or self-host PowerSync:

- **PowerSync Cloud**: [Create a new project on the PowerSync dashboard](https://dashboard.powersync.com) and connect it to your Supabase database using the `powersync_role` credentials created in step 2.
- **Self-hosting**: Follow the [self-hosting guide](https://docs.powersync.com/self-hosting/getting-started) to deploy your own PowerSync instance.

The sync rules for this demo are provided in [`sync-rules.yaml`](sync-rules.yaml) in this directory.

### 5. Set up local environment variables

Create a `.env` file in this directory with the following variables:

```bash
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NUXT_PUBLIC_POWERSYNC_URL=your_powersync_instance_url
```

Replace the values with your actual credentials:
- Get `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings under "Project Settings" -> "API"
- Get `NUXT_PUBLIC_POWERSYNC_URL` from your PowerSync instance (Cloud dashboard or your self-hosted instance URL)

### 6. Run the demo app

In this directory, run the following to start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to try out the demo.

## Project Structure

```
├── powersync/
│   ├── AppSchema.ts          # PowerSync schema definition
│   └── SuperbaseConnector.ts # Supabase connector implementation
├── plugins/
│   └── powersync.client.ts   # PowerSync plugin setup
├── pages/
│   ├── index.vue             # Main todo list page
│   ├── login.vue             # Login page
│   └── confirm.vue           # Auth confirmation page
├── components/
│   └── AppHeader.vue         # Header component
├── db/
│   └── seed.sql              # Database setup SQL
├── powersync.yaml             # PowerSync server configuration
├── sync-rules.yaml           # PowerSync sync rules
└── nuxt.config.ts            # Nuxt configuration
```

## Learn More

- [PowerSync Documentation](https://docs.powersync.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Nuxt Documentation](https://nuxt.com/)

