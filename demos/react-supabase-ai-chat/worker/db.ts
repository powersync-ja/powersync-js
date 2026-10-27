import postgres from 'postgres';

export const pg = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres');

/**
 * An assistant message the worker has claimed and is generating. Every write to it checks `claim_id`, which is new for
 * each claim, so it only lands while this attempt still owns the reply.
 */
export type ClaimedReply = { id: string; chat_id: string; user_id: string; claim_id: string };
