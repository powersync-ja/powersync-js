import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { APICallError, createProviderRegistry, generateText, type ModelMessage, streamText } from 'ai';
import { setTimeout } from 'node:timers/promises';

const SYSTEM_PROMPT =
  'You are a helpful assistant in a chat app. Answer clearly and concisely, and use Markdown when it helps.';

const TITLE_PROMPT =
  'Write a title of at most five words for a chat that starts with the message below. Reply with the title only, in the language of the message, without quotes or a final period.';

// Models are addressed as `provider/model`, e.g. `google/gemini-flash-lite-latest`. To use another AI SDK provider,
// install its package and add it here and to API_KEY_VARIABLES: https://ai-sdk.dev/providers/ai-sdk-providers
const registry = createProviderRegistry({ google, anthropic, openai }, { separator: '/' });

/** The environment variable each provider reads its API key from. */
const API_KEY_VARIABLES: Record<string, string> = {
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY'
};

const modelId = process.env.AI_MODEL || 'google/gemini-flash-lite-latest';
const apiKeyVariable = API_KEY_VARIABLES[modelId.split('/')[0]];

/** Set when replies are simulated, because the model's provider has no API key. */
export const missingApiKey = apiKeyVariable && !process.env[apiKeyVariable] ? apiKeyVariable : null;
export { modelId };

const model = registry.languageModel(modelId as Parameters<typeof registry.languageModel>[0]);

/**
 * Generates the next assistant reply for a conversation, yielding text as it arrives.
 */
export async function* generateReply(history: ModelMessage[], signal: AbortSignal): AsyncGenerator<string> {
  if (missingApiKey) {
    yield* simulateReply(signal);
    return;
  }

  const result = streamText({
    model,
    instructions: SYSTEM_PROMPT,
    messages: history,
    abortSignal: signal,
    // Errors are thrown below and logged by the worker, instead of the AI SDK's default console logging.
    onError: () => {}
  });

  // `textStream` leaves out errors, so read the full stream to surface them.
  for await (const part of result.stream) {
    if (part.type === 'text-delta') {
      yield part.text;
    } else if (part.type === 'error') {
      throw part.error;
    }
  }
}

/** Writes a short title for a chat from its first message, or returns null when replies are simulated. */
export async function generateTitle(firstMessage: string): Promise<string | null> {
  if (missingApiKey) return null;

  const { text } = await generateText({ model, instructions: TITLE_PROMPT, prompt: firstMessage, maxOutputTokens: 30 });
  // Models don't always follow the formatting instructions.
  return text.replace(/^["'*\s]+|["'*.\s]+$/g, '') || null;
}

/** A message for a failed reply, shown in the chat. */
export function describeError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    return error.statusCode === 429
      ? 'The model provider is rate limiting requests. Try again in a moment.'
      : `The model provider returned an error: ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Something went wrong while generating this reply.';
}

const SIMULATED_REPLY = `This reply is **simulated**: the worker has no \`${missingApiKey}\` for \`${modelId}\`, so it streams this text instead of calling the model. Add the key to \`.env.local\` and restart \`pnpm dev\` to chat with a real model.

The path a reply takes is the same either way:

1. Your message and an empty assistant placeholder were written to the local SQLite database, and PowerSync uploaded them to Postgres.
2. A Postgres trigger notified the worker, which started generating this reply.
3. The worker writes the text generated so far to the placeholder row on a fixed interval (\`STREAM_FLUSH_INTERVAL_MS\`), however many tokens arrived in between.
4. PowerSync syncs each write to every client subscribed to this chat, and the page re-renders the row.

Because the reply lives in the database, nothing is lost when the connection drops. Try refreshing the page, or opening this chat in a second tab, while a reply is streaming.`;

/** Streams {@link SIMULATED_REPLY} word by word, at roughly the pace of a real model. */
async function* simulateReply(signal: AbortSignal): AsyncGenerator<string> {
  for (const word of SIMULATED_REPLY.match(/\S+\s*/g) ?? []) {
    await setTimeout(25, undefined, { signal });
    yield word;
  }
}
