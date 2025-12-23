# note.

This project demonstrates how to build a note-taking application using Neon's Data API (powered by PostgREST), Neon Auth for authentication and PowerSync for real-time updates and offline support. Instead of using traditional database access via a backend, or even a backend at all, this demo showcases how to leverage PowerSync for SQLite queries of replicated Postgres data with a very elegant JS SDK.

**Note:** this demo was forked from [neon-data-api-neon-auth](https://github.com/neondatabase-labs/neon-data-api-neon-auth) to provide Neon users with a migration example of how to use PowerSync with Neon. The README provides only basic instructions for setting up the demo. Please refer to the [PowerSync documentation](https://neon.com/docs/powersync/get-started) for more information. 

**PowerSync JS SDK**

- SQLite queries of replicated dynamic subsets of Postgres data
- Real-time updates and offline support
- ORM support

**Neon Data API (PostgREST-compatible)**

- Instant REST API for your Postgres database
- Built-in filtering, pagination, and relationships
- Automatic OpenAPI documentation

This demo is built with:

- [Neon](https://neon.tech) — Serverless Postgres
- [Neon Auth](https://neon.com/docs/auth/overview) — Authentication with automatic JWT integration
- [Neon Data API](https://neon.com/docs/data-api/get-started) — Direct database access from the frontend, used for sending client mutations (that PowerSync queues in SQLite) to the backend
- [PowerSync Cloud](https://powersync.com) — Backend DB to SQLite Sync Engine
- [PowerSync JS SDK](https://powersync.com/docs/js-sdk/get-started) — Client SQLite interface to synced data
- [PowerSync TanStack Query](https://docs.powersync.com/client-sdk-references/javascript-web/javascript-spa-frameworks#tanstack-query) — Brings TanStack’s advanced asynchronous state management features to the PowerSync JS SDK
- [PowerSync Drizzle Driver](https://docs.powersync.com/client-sdk-references/javascript-web/javascript-orm/drizzle) - ORM driver for Drizzle


## Prerequisites

Before you begin, ensure you have:

- [pnpm](https://pnpm.io/) (v9.0 or newer) installed
- A [Neon account](https://console.neon.tech/signup) (free tier works)
- A [PowerSync account](https://powersync.com) (free tier works, self hosting also available)

## Getting Started

### 1. Create a Neon Project with Auth and Data API

1. Go to [pg.new](https://pg.new) to create a new Neon project
2. In the Neon Console, navigate to your project and enable:
   - **Neon Auth** — Go to the **Auth** page in the left sidebar and follow the setup wizard
   - **Data API** — Go to the **Data API** page in the left sidebar and enable it

For detailed instructions, see:

- [Getting started with Neon Auth](https://neon.com/docs/auth/overview)
- [Getting started with Data API](https://neon.com/docs/data-api/get-started)

### 2. Clone and Install

```bash
git clone https://github.com/powersync-ja/powersync-js.git
cd demos/react-neon-notes-tanstack
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Neon Data API URL
# Find this in Neon Console → Data API page → "Data API URL"
VITE_NEON_DATA_API_URL=https://your-project-id.data-api.neon.tech

# Neon Auth Base URL
# Find this in Neon Console → Auth page → "Auth Base URL"
# Note this comment: https://github.com/neondatabase/neon-data-api-neon-auth/pull/10#discussion_r2614978813
VITE_NEON_AUTH_URL=https://your-project-id.auth.neon.tech

# Database Connection String (for migrations)
# Find this in Neon Console → Dashboard → Connection string (select "Pooled connection")
DATABASE_URL=postgresql://user:password@your-project-id.pooler.region.neon.tech/neondb?sslmode=require

####### PowerSync Config ##########
# PowerSync instance URL, for PowerSync Cloud obtain from dashboard otherwise url of your self-hosted PowerSync Service
VITE_POWERSYNC_URL=https://foo.powersync.journeyapps.com
```

### 4. Set Up the Database

Run the migration to create the tables and RLS policies:

```bash
pnpm db:migrate
```

This will:

- Grant appropriate permissions to the `authenticated` and `anonymous` database roles
- Create the `notes` and `paragraphs` tables with RLS policies

### 5. Configure logical replication for PowerSync

PowerSync uses logical replication to sync data from your Neon project to your PowerSync instance, which is then synced to your SQLite database in the client. To configure logical replication follow the instructions in the [PowerSync documentation](https://docs.powersync.com/installation/database-setup#neon).

### 6. Connect PowerSync to your Neon project

In the PowerSync dashboard, create a project, an instance and then create a database connection to your Neon database using the credentials from the "Connect" button in the Neon Console.

### 7. Configure PowerSync auth and Sync Rules

### Auth
Navigate to "Client Auth" in the PowerSync dashboard and configure:

- Select "Enable development tokens"
- Populate the "JWKS URI" with the value from the "JWKS URL" field in the Neon Console → Auth page
- Populate the "JWT Audience" with your project root URL (e.g., `https://ep-restless-resonance-adom1z4w.neonauth.c-2.us-east-1.aws.neon.tech/`)

### Sync Rules
Navigate to "Sync Rules" in the PowerSync dashboard and configure these sync rules:

```yaml
config:
  edition: 2

bucket_definitions:
  by_user:
    # Only sync rows belonging to the user
    parameters: SELECT id as note_id FROM notes WHERE owner_id = request.user_id()
    data:
      - SELECT * FROM notes WHERE id = bucket.note_id
      - SELECT * FROM paragraphs WHERE note_id = bucket.note_id
  # Sync all shared notes to all users (not recommended for production)
  shared_notes:
    parameters: SELECT id as note_id from notes where shared = TRUE
    data:
      - SELECT * FROM notes WHERE id = bucket.note_id
      - SELECT * FROM paragraphs WHERE note_id = bucket.note_id
```

### 8. Test Sync
You can use the Sync Test to validate your Sync Rules, but since your app won't have any data at this point yet, you can skip this step for now.

Click on "Sync Test" test in the PowerSync dashboard, and enter the UUID of a user in your Neon Auth database to generate a test JWT. Then, click "Launch Sync Diagnostics Client" to test the sync rules. 

### 9. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment on Vercel

### 1. Push to GitHub

If you haven't already, push your code to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Import Project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"** and choose your repository
4. Vercel will auto-detect the Vite framework

### 3. Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable                 | Value                                        | Where to find it             |
| ------------------------ | -------------------------------------------- | ---------------------------- |
| `VITE_NEON_DATA_API_URL` | `https://your-project-id.data-api.neon.tech` | Neon Console → Data API page |
| `VITE_NEON_AUTH_URL`     | `https://your-project-id.auth.neon.tech`     | Neon Console → Auth page     |
| `VITE_POWERSYNC_URL`     | `https://foo.powersync.journeyapps.com`     | PowerSync Dashboard → Connect     |


> **Note:** You don't need `DATABASE_URL` on Vercel — migrations are run locally during development.

### 4. Deploy

Click **"Deploy"** and wait for the build to complete. Your app will be live at `your-project.vercel.app`.

### 5. Update Allowed Origins (Important!)

After deployment, update your Neon Auth settings to allow your Vercel domain:

1. Go to Neon Console → Auth page
2. Add your Vercel URL (e.g., `https://your-project.vercel.app`) to the allowed origins

## Development Notes

### Schema Changes

If you modify `src/db/schema.ts`, generate new migrations with:

```bash
pnpm db:generate
pnpm db:migrate
```

The `db:generate` command creates SQL migration files in the `/drizzle` folder based on your schema changes. You only need this when changing the database schema.

## Learn More

- [Neon Data API Documentation](https://neon.com/docs/data-api/get-started)
- [Neon Data API Tutorial](https://neon.com/docs/data-api/demo)
- [Neon Auth Documentation](https://neon.com/docs/auth/overview)
- [PowerSync Documentation](https://docs.powersync.com)