PowerSync E2EE TODO (App)

This folder contains the demo app and its reusable data layer. It’s designed to be easy to fork and adapt for your own encrypted data projects.

- Frontend: `packages/todo-raw-table/frontend` (React + Vite + Tailwind)
- Infra: `packages/todo-raw-table/infra`

## Hosted setup (Supabase + PowerSync)

This is the simplest path: use a hosted Supabase project and a hosted PowerSync instance.

### 1) Install deps

From the repo root:

```sh
pnpm install
pnpm build:packages
pnpm --filter apps-e2ee build
```

### 2) Supabase (hosted, via CLI)

1) Create a Supabase project (if you don’t have one).
2) Login and link the CLI to your hosted project:

```sh
supabase login
pnpm -filter @app/todo-e2ee supabase:init
# Link the CLI to your hosted project. E.g. if the url to your project is https://supabase.com/dashboard/project/mcvxpinhffmvwutgsdua
# then your project ref is `mcvxpinhffmvwutgsdua`
pnpm -filter @app/todo-e2ee supabase:link --project-ref <your-project-ref>
```

3) Apply the schema using the CLI (one command):

```sh
pnpm --filter @app/todo-e2ee supabase:db:push
```

```sh
pnpm --filter @app/todo-e2ee migrate
```

This generates a timestamped migration from `packages/todo-raw-table/infra/schema.sql` and pushes it to your linked project.

If you have old/broken local migrations and the CLI warns about them, clean the local migrations and try again:

```sh
pnpm --filter @app/todo-e2ee migrate:reset
```

After it completes, confirm the tables exist in the Supabase Dashboard → Table Editor (you should see `public.todos` and `public.e2ee_keys`.


If you want Anonymous authentication/guest access. Then you can enable it in your Supabase project by going to your Project → Authentication → Sign In / Provider -> Allow anonymous sign-ins.
Press Save changes.

### 3) PowerSync (hosted)

1) Create or open your PowerSync instance.
2) Provide a Postgres connection from your Supabase database:

   Go to [supabase.com](https://supabase.com), open your project (or create one), then click connect
   [![image](https://mintcdn.com/powersync/lquPOu2QW4XM9BQW/images/installation/supabase-connect-database.png?w=840&fit=max&auto=format&n=lquPOu2QW4XM9BQW&q=85&s=f1efcf8469cc66599743d409b3a3ac09)](https://mintcdn.com/powersync/lquPOu2QW4XM9BQW/images/installation/supabase-connect-database.png?w=840&fit=max&auto=format&n=lquPOu2QW4XM9BQW&q=85&s=f1efcf8469cc66599743d409b3a3ac09)

   then copy the connection string.
   [![image](https://mintcdn.com/powersync/lquPOu2QW4XM9BQW/images/installation/supabase-connection-string.png?w=840&fit=max&auto=format&n=lquPOu2QW4XM9BQW&q=85&s=de82c69c2c1b6b235b091b696e8a5e73)](https://mintcdn.com/powersync/lquPOu2QW4XM9BQW/images/installation/supabase-connection-string.png?w=840&fit=max&auto=format&n=lquPOu2QW4XM9BQW&q=85&s=de82c69c2c1b6b235b091b696e8a5e73)


   Keep this URL for later.

   Also we need to create a PowerSync user in the SQL editor in Supabase:

   ```sql
      -- Create a role/user with replication privileges for PowerSync
   CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'myhighlyrandompassword';
   -- Set up permissions for the newly created role
   -- Read-only (SELECT) access is required
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;  

   -- Optionally, grant SELECT on all future tables (to cater for schema additions)
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role; 
   ````
   Read more [here](https://docs.powersync.com/integration-guides/supabase-+-powersync#create-a-powersync-database-user)

   Last step. 
   Create the Postgres Publication
   Run the below SQL statement in your Supabase SQL Editor to create a Postgres publication:

   ```sql
   -- Create a publication to replicate tables. 
   -- Specify a subset of tables to replicate if required.
   -- The publication must be named "powersync"
   CREATE PUBLICATION powersync FOR ALL TABLES;
   ```
   
   Create PowerSync instance

   Now go to the [PowerSync dashboard](https://powersync.journeyapps.com/). Create a new project

   Create a new instance

   In the PowerSync dashboard:

   - Open your instance → Settings → Sync Rules
   - Replace the editor contents with the YAML from:
     - [packages/todo-raw-table/infra/powersync/sync_rules.yaml](./infra/powersync/sync_rules.yaml)
   - Click Validate, then Save

   The rules use `request.user_id()` (resolved from the authenticated identity, e.g. Supabase JWT `sub`) to select only rows for the current user in `public.todos` and `public.e2ee_keys`.

   Read more [here](https://docs.powersync.com/integration-guides/supabase-+-powersync#configuring-powersync)

### 4) Frontend env (no secrets beyond anon key)

Create `packages/todo-raw-table/frontend/.env.local` from the example and fill values:

```sh
cp packages/todo-raw-table/frontend/.env.example packages/todo-raw-table/frontend/.env.local
```

Open the [file](./frontend/.env.local) and fill in the values:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_POWERSYNC_URL=<your-powersync-instance-url>
```
### 5) Run the app

```sh
pnpm --filter @app/todo-e2ee dev
```

Open the printed URL in your browser.

## Project structure

- `frontend/src` — UI, minimal data adapter (`src/lib/powersyncClient.ts`)
- `lib/src` — PowerSync repository, schema and SQL for encrypted TODOs
- `infra/schema.sql` — DB schema and RLS

## Notes

- Only `user_id` and optional `bucket_id` are stored in plaintext for filtering. Encrypted envelope columns contain nonce/ciphertext/KDF params.