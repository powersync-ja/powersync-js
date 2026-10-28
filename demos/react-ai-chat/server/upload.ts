import type { Request, Response } from 'express';
import postgres from 'postgres';
import { pg } from './db.ts';
import { respond, stop } from './replies.ts';

/**
 * The tables the app uploads changes to, and the columns it may write in each. The rest are the backend's: `user_id`
 * is always the user the request's token was issued to, and only the backend writes `write_count` and `claim_id`.
 */
const WRITABLE_COLUMNS = new Map([
  ['chats', ['title', 'created_at', 'updated_at']],
  ['messages', ['chat_id', 'role', 'content', 'status', 'created_at']]
]);

/** Column values, by column name. */
type Values = Record<string, postgres.JSONValue>;

/** A change to one row, as the app's PowerSync upload queue recorded it (see BackendConnector.ts). */
type Operation = {
  op: 'PUT' | 'PATCH' | 'DELETE';
  table: string;
  id: string;
  /** The row's values for a PUT, the changed ones for a PATCH. */
  data?: Values;
};

/**
 * `POST /api/upload`: applies one transaction from the app's upload queue, `{ operations: Operation[] }`, in one
 * Postgres transaction. Behind `authenticate` (see auth.ts). There is no row-level security: each change only applies
 * to rows of the user the request's token was issued to, and ignores the columns the app may not write.
 *
 * Responds 422 when the transaction can never apply, so the app discards it, and 500 when it might apply later, so the
 * app tries again.
 */
export async function upload(req: Request, res: Response) {
  const userId: string = res.locals.userId;
  const operations: Operation[] = req.body?.operations;
  if (!Array.isArray(operations) || !operations.every(isValid)) {
    res.status(422).json({ error: 'Expected PUT, PATCH or DELETE operations on chats or messages' });
    return;
  }

  // The changes to messages that applied, to act on once they're committed.
  const messageChanges: Operation[] = [];
  try {
    await pg.begin(async (tx) => {
      for (const operation of operations) {
        const { count } = await write(tx, operation, userId);
        if (operation.table === 'messages' && count > 0) messageChanges.push(operation);
      }
    });
  } catch (error) {
    // Values Postgres rejects (SQLSTATE class 22), or a broken constraint such as a message in a chat that doesn't
    // exist (class 23), are rejected again on every retry.
    if (error instanceof postgres.PostgresError && /^2[23]/.test(error.code)) {
      console.error('Discarding an upload that can never apply:', error.message);
      res.status(422).json({ error: error.message });
      return;
    }
    // Anything else, such as Postgres being unreachable, might pass on a retry. Express responds 500.
    throw error;
  }

  // New placeholders and retried replies are 'pending', so generate them. Cancel the replies the user stopped or deleted.
  for (const { op, id, data } of messageChanges) {
    if (data?.status === 'pending') respond(id);
    if (data?.status === 'stopped' || op === 'DELETE') stop(id);
  }
  res.json({});
}

/**
 * Applies one change to a row of `userId`, in the upload's transaction. Its `count` is 0 when it changed nothing, e.g.
 * if the row is another user's.
 */
function write(tx: postgres.TransactionSql, { op, table, id, data = {} }: Operation, userId: string) {
  const columns = WRITABLE_COLUMNS.get(table)!.filter((column) => column in data);

  switch (op) {
    case 'PUT': {
      // Inserts the row, or replaces it if it exists and is this user's.
      const row: Values = { ...data, id, user_id: userId };
      return tx`
        INSERT INTO ${tx(table)} ${tx(row, ['id', 'user_id', ...columns])}
        ON CONFLICT (id) DO UPDATE SET ${tx(data, columns)}
        WHERE ${tx(table)}.user_id = ${userId}`;
    }
    case 'PATCH':
      // A PATCH can change only columns the app may not write, which leaves nothing to set.
      if (columns.length === 0) return { count: 0 };
      // A stop that arrives after the reply finished leaves it as it is.
      return tx`
        UPDATE ${tx(table)} SET ${tx(data, columns)}
        WHERE id = ${id} AND user_id = ${userId}
        ${data.status === 'stopped' ? tx`AND status IN ('pending', 'streaming')` : tx``}`;
    case 'DELETE':
      return tx`DELETE FROM ${tx(table)} WHERE id = ${id} AND user_id = ${userId}`;
  }
}

function isValid(operation: Operation) {
  return (
    ['PUT', 'PATCH', 'DELETE'].includes(operation?.op) &&
    WRITABLE_COLUMNS.has(operation.table) &&
    typeof operation.id === 'string' &&
    (operation.data === undefined ||
      (typeof operation.data === 'object' && operation.data !== null && !Array.isArray(operation.data)))
  );
}
