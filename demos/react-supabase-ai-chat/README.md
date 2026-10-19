# PowerSync + Supabase: AI Chat

This demo shows how to stream AI chat replies to clients with PowerSync. The app looks like a typical chatbot, but the browser never calls the model. It writes the question to its local SQLite database, and the reply arrives as updates to a synced row.

Because each reply is a database row:

- Refreshing the page mid-reply picks up where it left off.
- The reply streams to every tab and device that has the chat open.
- A question asked offline is answered after the app reconnects.

A reply goes through these steps:

1. `sendMessage` in `src/library/chat.ts` writes the user's message and an empty assistant message (status `pending`) in one local transaction. PowerSync uploads both to Supabase.
2. A trigger on the `messages` table calls `pg_notify`. The AI worker in `worker/` listens for it, claims the message and generates a reply with the [AI SDK](https://ai-sdk.dev).
3. While the reply streams, the worker writes the text so far to `messages.content` every 100 ms. When the reply is complete, it sets the status to `done`.
4. PowerSync syncs each write to the clients subscribed to that chat, and `useQuery` re-renders the message.

Writing on an interval instead of once per token keeps each reply at about 10 updates per second, however fast the model produces tokens. The app shows the write count under each reply, and the worker logs it, for example `1601 characters in 9 writes over 2041 ms`. Each write syncs the whole row, so very long replies or many viewers per chat add up. At that scale you could append chunks to a separate table, or stream tokens to the active client over a direct connection and only persist the finished message through PowerSync.

Each write adds a step of text, and some models (Gemini included) send text in a few large chunks. To keep replies readable, `useSmoothText` in `src/components/chat/` reveals new text at a steady pace between writes.

The first reply in a chat also names it: the worker asks the model for a short title and writes it to `chats.title`, and the sidebar updates through the `chats` stream.

The Sync Streams are defined in `powersync/sync-config.yaml`. The chat list is always synced, and messages are synced per chat while it is open:

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

Stopping and retrying a reply are data changes too. **Stop** (or **Esc**) sets the status to `stopped`. The worker only writes while the status is `streaming`, so its next write matches no row and it cancels the model request. **Retry** sets the status back to `pending`, which fires the trigger again.

The demo runs against local Supabase (`supabase start`) and self-hosted PowerSync (via the PowerSync CLI). It uses anonymous Supabase auth, so there is no login screen.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (running)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [PowerSync CLI](https://docs.powersync.com/tools/cli)
- Node.js 22 or later

## Local development (recommended)

1. Switch into this demo:

   ```bash
   cd demos/react-supabase-ai-chat
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create env file:

   ```bash
   cp .env.local.template .env.local
   ```

   The template points at the local services. For real replies, create a free Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey) (no credit card needed) and set `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`. Without a key, the worker streams a simulated reply through the same path.

4. Start local Supabase + local PowerSync:

   > Ensure the [PowerSync CLI](https://docs.powersync.com/tools/cli) is installed before running the following command.

   ```bash
   pnpm local:up
   ```

   This does three things:
   - starts Supabase Docker services and applies the migrations in `supabase/migrations`
   - starts PowerSync using the checked-in `powersync/service.yaml`
   - loads Sync Streams from `powersync/sync-config.yaml`

   Both use the default local ports (54321-54323 and 8080), so stop any other local Supabase project first.

5. Start the app and the AI worker:

   ```bash
   pnpm dev
   ```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

The worker reads these settings from `.env.local`. Vite only exposes `VITE_` variables to the browser, so API keys stay on the server.

| Variable                       | Default                           | Description                                                  |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------ |
| `AI_MODEL`                     | `google/gemini-flash-lite-latest` | Model used for replies, as `provider/model`.                 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (empty)                           | Google Gemini API key.                                       |
| `ANTHROPIC_API_KEY`            | (empty)                           | Anthropic API key, for `anthropic/...` models.               |
| `OPENAI_API_KEY`               | (empty)                           | OpenAI API key, for `openai/...` models.                     |
| `STREAM_FLUSH_INTERVAL_MS`     | `100`                             | How often the reply is written to Postgres while it streams. |
| `DATABASE_URL`                 | Local Supabase                    | Postgres connection the worker listens on and writes to.     |

To use Claude, for example, set `AI_MODEL=anthropic/claude-opus-5-5` and `ANTHROPIC_API_KEY`. To add another provider, install its [AI SDK provider package](https://ai-sdk.dev/providers/ai-sdk-providers) and register it in `worker/model.ts`.

## Database setup

The schema is in `supabase/migrations/20261016000000_init_chat.sql`. When Supabase starts for the first time, the migrations create:

- the `chats` and `messages` tables
- RLS policies that limit each user, including anonymous users, to their own chats
- the `assistant_reply_requested` trigger that notifies the worker
- the `powersync` publication

Run `supabase db reset` to re-apply the migrations from scratch.

## Notes

- The app signs in with `signInAnonymously()` in the connector, so each browser profile is a separate user.
- Use **Go offline** at the bottom of the sidebar to ask a question while offline.
- Keyboard shortcuts: **Esc** stops a reply, **⇧⌘O** (Ctrl+Shift+O on Windows and Linux) starts a new chat, and typing anywhere on the page goes into the message box.
- The development server includes [PowerSync DevTools](https://docs.powersync.com/tools/devtools/vite). Open the Vite DevTools dock and select **PowerSync** to watch the `messages` table change while a reply streams.
- The worker connects as the `postgres` superuser. In production, give it a role that can only read and update `messages`.
- Several workers can run at once. Each one claims a reply with a conditional `UPDATE`, so a reply is only generated once. On startup, the worker restarts replies that a previous run left `streaming`. With several workers, track which worker owns a reply instead.
- To stop local services:

  ```bash
  pnpm local:down
  ```

## Learn More

- [PowerSync Sync Streams](https://docs.powersync.com/sync/streams/overview)
- [PowerSync CLI docs](https://docs.powersync.com/tools/cli)
- [AI SDK: generating and streaming text](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
