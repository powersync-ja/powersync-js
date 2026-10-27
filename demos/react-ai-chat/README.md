# PowerSync + Postgres: AI Chat

This demo shows two ways to stream AI chat replies to clients with PowerSync. The app looks like a typical chatbot, but the browser never calls the model. It writes the question to its local SQLite database, and the backend API writes the reply to a synced row.

Because each reply is a database row:

- Refreshing the page mid-reply picks up where it left off.
- The reply streams to every tab and device that has the chat open.
- A question asked offline is answered after the app reconnects.

Everything runs on your machine: Postgres and the PowerSync Service in Docker, and the React app (`src/`) and the backend API (`server/`) with `pnpm dev`. The backend applies the changes the app uploads to Postgres and generates replies with the [AI SDK](https://ai-sdk.dev), and PowerSync replicates Postgres and syncs each user's rows back to the app.

## Two streaming modes

`VITE_STREAM_MODE` in `.env.local` picks how the text reaches the app while the reply generates. Thick arrows carry the reply while it generates, and dotted arrows carry it once, when it's finished.

**Postgres mode**

```mermaid
flowchart LR
  app["App<br>(local SQLite)"] -->|"question and empty reply<br>(POST /api/upload)"| backend
  subgraph backend [Backend API]
    buffer["Reply text<br>(in memory)"]
  end
  backend -->|question and empty reply| pg[("Postgres")]
  buffer <==>|tokens| model[Model]
  buffer ==>|"text so far, at most every 100 ms"| pg
  pg ==>|replication| powersync[PowerSync Service]
  powersync ==>|syncs each write| app
```

**SSE mode**

```mermaid
flowchart LR
  app["App<br>(local SQLite)"] -->|"question and empty reply<br>(POST /api/upload)"| backend
  subgraph backend [Backend API]
    buffer["Reply text<br>(in memory)"] ==> endpoint["SSE endpoint<br>/api/replies/:id/stream"]
  end
  backend -->|question and empty reply| pg[("Postgres")]
  buffer <==>|tokens| model[Model]
  backend -.->|"status, then full text"| pg
  pg -.->|replication| powersync[PowerSync Service]
  powersync -.->|"syncs status, then full text"| app
  app -->|connects when streaming| endpoint
  endpoint ==>|"text so far, then new text"| app
```

|                            | `postgres` (default)                                                                                    | `sse`                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| While the reply generates  | The backend writes the text so far to the reply's row at most every 100 ms. PowerSync syncs each write. | The backend sends the text to the app over Server-Sent Events. The reply's row isn't written until it's finished. |
| When the reply is finished | The last write sets the status to `done`.                                                               | The backend writes the full text and `done` to the row once. PowerSync syncs that write.                          |
| Text writes per reply      | Up to 10 per second while it generates                                                                  | 1                                                                                                                 |
| Code                       | `server/stream-postgres.ts`                                                                             | `server/stream-sse.ts` and `src/components/chat/useSseReply.ts`                                                   |

Postgres mode is the simpler one: the database is the only channel, and PowerSync does the rest. SSE mode keeps the token stream out of Postgres, which matters when many replies generate at once. It uses a pattern some chat apps use at scale: tokens over SSE, and the database only for the finished message.

Everything else is shared:

1. `sendMessage` in `src/library/chat.ts` writes the user's message and an empty assistant message (status `pending`) in one local transaction. PowerSync calls `uploadData` in `src/library/powersync/BackendConnector.ts`, which sends the transaction to `POST /api/upload`.
2. The backend (`server/upload.ts`) applies it to Postgres in one transaction. Because the new reply is `pending`, the backend then claims it (`server/replies.ts`): it sets the status to `streaming` and a new `claim_id`, loads the chat's earlier messages, and asks the model for a reply. Every later write to the reply checks that `claim_id`.
3. The text reaches the app in the way the mode describes.
4. The finished reply ends up in the row, and PowerSync replicates it from Postgres and syncs it to every client subscribed to that chat.

### Postgres mode

Writing on an interval instead of once per token keeps each reply to at most 10 writes per second, however fast the model produces tokens. The app shows the write count under each reply, and the backend logs it, for example `1601 characters in 9 writes over 2041 ms` with `STREAM_THROTTLE=false`. The default throttle (see below) spreads that reply over about 16 seconds, so about 160 writes. Each write syncs the whole row, so very long replies or many viewers per chat add up.

### SSE mode

The app opens an SSE connection to `GET /api/replies/:id/stream` for each reply whose synced status is `streaming`, so other tabs and devices stream it too. The backend keeps each reply's text in memory, and a client that connects late or reconnects first gets everything generated so far. If the connection drops, or the backend can't serve the reply yet (for example while it restarts), the app tries again every second for as long as the reply's synced status is `streaming`. The endpoint only serves a reply to the user who owns it.

When the reply is finished, the backend writes it once and ends the SSE connections. The app keeps showing the streamed text until the saved row syncs. With several backend instances, each chat's clients have to reach the instance generating its reply, which is the problem services like Cloudflare Durable Objects solve.

### In both modes

Some models (Gemini included) send text in a few large chunks. The backend evens this out in `server/throttle.ts`: it sends each reply on at up to `STREAM_CHARS_PER_SECOND` (100 by default) and holds the rest until its turn, so a reply can finish a few seconds after the model does. In SSE mode, stopping a reply saves the text sent so far, not the text still held back. Set `STREAM_THROTTLE=false` to send text as soon as the model generates it.

Each synced write or SSE event still adds a step of text, so `useSmoothText` in `src/components/chat/` reveals new text at a steady pace. Set `VITE_SMOOTH_TEXT=false` to see the steps as they arrive.

When the backend has an API key for the model, the first reply in a chat also names it: the backend asks the model for a short title and writes it to `chats.title`, and the sidebar updates through the `chats` stream. Without a key, a chat keeps the title the app took from its first message.

## Sync Streams

The Sync Streams are defined in `powersync/sync-config.yaml`. The chat list is always synced, and messages are synced per chat while it is open. `auth.user_id()` is the user id in the token the backend issued.

```yaml
streams:
  chats:
    auto_subscribe: true
    query: SELECT * FROM chats WHERE user_id = auth.user_id()

  chat_messages:
    query: |
      SELECT * FROM messages
      WHERE chat_id = subscription.parameter('chat_id')
        AND user_id = auth.user_id()
```

The chat view in `src/app/views/chat/page.tsx` subscribes to `chat_messages` with the `streams` option of `useQuery`:

```tsx
const { data: messages } = useQuery<MessageRecord>(
  'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at',
  [chatId],
  { streams: [{ name: 'chat_messages', parameters: { chat_id: chatId } }] }
);
```

## Stop and retry

Stopping and retrying a reply are data changes too. **Stop** (or **Esc**) sets the reply's status to `stopped`. When the backend applies that upload, or one that deletes the chat, it cancels the model request. In Postgres mode the reply keeps the text written so far, and in SSE mode the backend saves the text sent so far in one write. **Retry** sets the status back to `pending`, so the backend claims the reply again like a new one. The new claim gets a new `claim_id`, so if the old attempt is still running, its writes match no row and only the new attempt is saved.

## The backend API

`server/index.ts` is an Express app on port 6060, and the Vite dev server proxies `/api` to it:

- `POST /api/auth/token` signs a token for a user id. PowerSync and the backend both accept it.
- `POST /api/upload` applies one transaction from the app's upload queue, then starts replies that became `pending` and cancels replies that were stopped or deleted.
- `GET /api/replies/:id/stream` streams a reply while it generates, in SSE mode only.

There is no sign-in: the app makes up a random user id on first load and keeps it in `localStorage`, and the backend signs a token for whatever user id it is given. That stands in for real sign-in and is not secure, because anyone who knows a user id can get a token for it.

There is no row-level security either, because the backend is the only writer. `server/upload.ts` applies each change only to rows of the token's user, and only to the columns in `WRITABLE_COLUMNS`. It responds 422 for a change that can never apply, which the app discards, and 500 for other errors, which PowerSync retries.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (running)
- Node.js 22.22 or later
- [pnpm](https://pnpm.io/installation)
- The [PowerSync CLI](https://docs.powersync.com/tools/cli) (`npm install -g @powersync/cli`), which runs the local Docker services

## Local development

1. Switch into this demo:

   ```bash
   cd demos/react-ai-chat
   ```

2. Create the env file:

   ```bash
   cp .env.local.template .env.local
   ```

   The template points at the local services. For real replies, create a free Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey) (no credit card needed) and set `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`. Without a key, the backend streams a simulated reply through the same path.

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Start Postgres and the PowerSync Service:

   ```bash
   pnpm local:up
   ```

   This runs `powersync docker start`, which starts the Docker services in `powersync/docker/`: the app's Postgres (`pg-db`) on `127.0.0.1:5432`, a second Postgres for PowerSync's bucket storage (`pg-storage`) on `127.0.0.1:5433`, and the PowerSync Service on `127.0.0.1:8080`. Stop anything else on those ports first.

5. Start the app and the backend API:

   ```bash
   pnpm dev
   ```

   The backend logs which model it replies with, or that it is simulating replies.

Open [http://localhost:5173](http://localhost:5173).

## Configuration

The app and the backend read these settings from `.env.local`. Vite only exposes `VITE_` variables to the browser, so API keys and `JWT_SECRET` stay on the server. While `pnpm dev` runs, changing `.env.local` restarts the backend.

| Variable                       | Read by         | Default                                                  | Description                                                                                                         |
| ------------------------------ | --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_POWERSYNC_URL`           | App             | None. The template sets `http://127.0.0.1:8080`.         | PowerSync Service URL.                                                                                              |
| `VITE_STREAM_MODE`             | App and backend | `postgres`                                               | How replies stream: `postgres` or `sse` (see above).                                                                |
| `VITE_SMOOTH_TEXT`             | App             | `true`                                                   | Reveal reply text at a steady pace (see above).                                                                     |
| `AI_MODEL`                     | Backend         | `google/gemini-flash-lite-latest`                        | Model used for replies and chat titles, as `provider/model`.                                                        |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Backend         | (empty)                                                  | Google Gemini API key, for `google/...` models.                                                                     |
| `ANTHROPIC_API_KEY`            | Backend         | (empty)                                                  | Anthropic API key, for `anthropic/...` models.                                                                      |
| `OPENAI_API_KEY`               | Backend         | (empty)                                                  | OpenAI API key, for `openai/...` models.                                                                            |
| `DATABASE_URL`                 | Backend         | `postgresql://postgres:changeme@127.0.0.1:5432/postgres` | Postgres connection the backend reads and writes.                                                                   |
| `JWT_SECRET`                   | Backend         | None, required. The template sets the development key.   | Base64url-encoded HS256 key the backend signs tokens with. It must match the `k` value in `powersync/service.yaml`. |
| `STREAM_FLUSH_INTERVAL_MS`     | Backend         | `100`                                                    | Postgres mode: how often the reply is written while it streams.                                                     |
| `STREAM_THROTTLE`              | Backend         | `true`                                                   | Send each reply at a steady pace (see above). `false` sends text as soon as the model generates it.                 |
| `STREAM_CHARS_PER_SECOND`      | Backend         | `100`                                                    | The most characters per second the backend sends a reply at, while `STREAM_THROTTLE` is on.                         |

To use Claude, for example, set `AI_MODEL=anthropic/claude-opus-5-5` and `ANTHROPIC_API_KEY`. To add another provider, install its [AI SDK provider package](https://ai-sdk.dev/providers/ai-sdk-providers) and register it in `server/model.ts`.

## Database setup

`powersync/docker/modules/database-postgres/init-scripts/01-init.sql` creates the `chats` and `messages` tables and the `powersync` publication that PowerSync replicates. The Docker settings, such as the Postgres passwords, are in `powersync/docker/.env`.

Postgres only runs it when it creates its data volume, on the first `pnpm local:up`. To run it again, for example after editing it, remove the containers and volumes and start again. This deletes all chats:

```bash
pnpm local:down --remove --remove-volumes
pnpm local:up
```

## Notes

- The user id lives in `localStorage`, so each browser profile is a separate user, and clearing site data starts a new user with no chats.
- Use **Go offline** at the bottom of the sidebar to ask a question while offline.
- Keyboard shortcuts: **Esc** stops a reply, **⇧⌘O** (Ctrl+Shift+O on Windows and Linux) starts a new chat, and typing anywhere on the page goes into the message box.
- The development server includes [PowerSync DevTools](https://docs.powersync.com/tools/devtools/vite). Open the Vite DevTools dock and select **PowerSync** to watch the `messages` table change while a reply streams.
- The shared secret (HS256) that signs tokens is checked into `powersync/service.yaml` and the env template, so it is for local development only. In production, use an asymmetric key and a JWKS endpoint.
- The backend and PowerSync connect as the `postgres` superuser. In production, give each a role with only the access it needs.
- On startup, before it accepts requests, the backend generates every reply left `streaming` again from the start. This assumes there is only one backend instance. With several, each would also restart replies the others are still generating, and a stop would only cancel a reply right away when it reached the instance generating it. To run several, track which instance owns each reply.
- `docker compose -p powersync_react-ai-chat logs -f powersync` shows the PowerSync Service's logs. To stop the local services and keep the data:

  ```bash
  pnpm local:down
  ```

## Learn More

- [PowerSync Sync Streams](https://docs.powersync.com/sync/streams/overview)
- [Writing client changes to your backend](https://docs.powersync.com/handling-writes/writing-client-changes)
- [Custom authentication](https://docs.powersync.com/configuration/auth/custom)
- [Self-hosted PowerSync Service configuration](https://docs.powersync.com/configuration/powersync-service/self-hosted-instances)
- [AI SDK: generating and streaming text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
