import postgres from 'postgres';

export const pg = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');

/** An assistant message the worker has claimed and is generating. */
export type ClaimedReply = { id: string; chat_id: string; user_id: string };
