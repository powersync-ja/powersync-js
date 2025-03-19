# PowerSync Yjs Document Collaboration Demo

This is a simple CRDT text collaboration demo powered by [Yjs](https://github.com/yjs/yjs) and [Tiptap](https://tiptap.dev/) which uses [PowerSync](https://www.powersync.com/) as both the persistence and connection provider. This means that the Yjs CRDT data structures are stored in Postgres. Conflicts are automatically resolved using CRDTs.

<https://github.com/powersync-ja/powersync-web-sdk/assets/93317/fc0c2b2f-feb7-441b-895a-94893db46563>

This demo is built using the [PowerSync JS web SDK](https://docs.powersync.com/client-sdk-references/js-web).

## Setup Instructions

### 1. Install dependencies

In the repo directory, use [pnpm](https://pnpm.io/installation) to install dependencies:

```bash
pnpm install
pnpm build:packages
```

### 2. Create project on Supabase and set up Postgres

This demo app uses Supabase as its Postgres database and backend:

1. [Create a new project on the Supabase dashboard](https://supabase.com/dashboard/projects).
2. Go to the Supabase SQL Editor for your new project and execute the SQL statements in [`database.sql`](database.sql) to create the database schema, database functions, and publication needed for PowerSync.
3. Enable "anonymous sign-ins" for the project [here](https://supabase.com/dashboard/project/_/auth/providers).

### 3. Create new project on PowerSync and connect to Supabase/Postgres

If you don't have a PowerSync account yet, [sign up here](https://accounts.journeyapps.com/portal/free-trial?powersync=true).

Then, in the [PowerSync dashboard](https://powersync.journeyapps.com/), create a new PowerSync instance:

1. Right-click on 'PowerSync Project' in the project tree on the left and click "Create new instance"
2. Pick a name for the instance e.g. "Yjs Demo Test" and proceed.
3. In the "Edit Instance" dialog that follows, click on the "Connections" tab.
4. Click on the "+" button to create a new database connection.
5. Input the credentials from the project you created in Supabase. In the Supabase dashboard, under your project you can go to "Project Settings" and then "Database" and choose "URI" under "Connection string", untick the "Use connection pooling" option, and then copy & paste the connection string into the PowerSync dashboard "URI" field, and then enter your database password at the "Password" field.
6. Click the "Test connection" button and you should see "Connection success!"
7. Click on the "Credentials" tab of the "Edit Instance" dialog.
8. Tick the "Use Supabase Auth" checkbox and configure the JWT secret.
9. Click "Save" to save all the changes to your PowerSync instance. The instance will now be deployed — this may take a minute or two.

### 4. Create Sync Rules on PowerSync

1. Open the [`sync-rules.yaml`](sync-rules.yaml) in this repo and copy the contents.
2. In the [PowerSync dashboard](https://powersync.journeyapps.com/), paste that into the 'sync-rules.yaml' editor panel.
3. Click the "Deploy sync rules" button and select your PowerSync instance from the drop-down list.

### 5. Set up local environment variables

To set up the environment variables for the demo app:

1. Copy the `.env.local.template` file to `.env.local`:

```bash
cp .env.local.template .env.local
```

2. Edit `.env.local` and populate the relevant values:
   - Set `VITE_SUPABASE_URL` to your Supabase project URL. You can find this by going to the main page for the project on the Supabase dashboard and then look for "Project URL" in the "Project API" panel.
   - Set `VITE_SUPABASE_ANON_KEY` to your Supabase API key. This can be found right below the Project URL on the Supabase dashboard.
   - Set `VITE_POWERSYNC_URL` to your PowerSync instance URL (this is the same URL from step 3)

### 6. Run the demo app

In this directory, run the following to start the development server:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to try out the demo.

To try out the collaborative editing, copy and paste the URL of the page and open it in another browser (or another browser window).

<img width="1135" alt="295090638-a55d5ee5-0da9-4ab6-a584-1741fb97de9f" src="https://github.com/powersync-ja/powersync-web-sdk/assets/93317/a10257d8-c614-4818-818a-2e722cd69d67">

### (Optional) Supabase edge function for merging document updates

The more edits are made to a document, the longer the Yjs CRDT update history becomes. There is currently a [very basic edge function](supabase/functions/merge-document-updates/index.ts) available to merge updates into a single update row.

You can deploy it using the following command:

```bash
supabase functions deploy merge-document-updates
```

And invoke it using the Supabase CLI:

```bash
curl -L -X POST 'https://<project-ref>.supabase.co/functions/v1/merge-document-updates' -H 'Authorization: Bearer [anon-key]' --data '{"document_id":"[document-id]"}'
```

Replace `<project-ref>` with your Supabase project ref, `[anon-key]` with your Supabase API key, and `[document-id]` with the UUID of the document (found in the URL of the specific document you're editing the demo app).

Note that this is not a production-grade implementation of merging updates – the current implementation will have race conditions and is only a PoC for development/testing.

## Demo App Roadmap

To-do

- [ ] Add user sessions. For ease of demoing, still allow anonymously signing in (perhaps using [this Supabase workaround](https://github.com/supabase/gotrue/issues/68)), but keep track of session data so that each user has a unique `user_id` which we can associate with edits to the document.
- [ ] Improve sync rules: Use a many-to-many relationship between users and documents, so that all documents and their updates are not synced to all users. Dependent on user sessions.
- [ ] Add suggested RLS rules for Supabase. Dependent on user sessions.
- [ ] Add live cursor support; allow user to set their name, prepopulate with auto-generated name if none set. Dependent on user sessions.
- [ ] Show PowerSync connection status; allow user to toggle offline/online for testing purposes
- [ ] Add button to the UI allowing the user to merge the Yjs edits i.e. `document_update` rows. Invoke `merge-document-updates` edge function in Supabase.
- [ ] Prepopulate sample text into newly created documents.
- [ ] Improve performance / rework inefficient parts of implementation:
  - [ ] Optimize the 'seen updates' approach to filter the `SELECT` query for updates that have not yet been seen — perhaps based on `created_at` timestamp generated on the Postgres side. For the watch query — watch for certain tables instead of watching a query. This will allow querying `document_updates` with a dynamic parameter.
  - [ ] Flush 'seen updates' when `document_updates` are merged.

Done

- [x] Show number of edits (rows in `document_updates`) on the document
- [x] For ease of demoing, when the user hits the root page, either generate a new random document UUID and redirect the user to that document, or redirect to last viewed document ID if any (ID stored in local storage).
- [x] Add function to merge document updates; can be invoked if number of `document_updates` becomes too large (currently a row is created in `document_updates` for every edit/update from the Yjs document)
