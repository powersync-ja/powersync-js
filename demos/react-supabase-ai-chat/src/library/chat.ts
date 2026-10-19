import { AbstractPowerSyncDatabase } from '@powersync/web';

/**
 * Asks a question: writes the user's message and an empty assistant placeholder to the local database.
 *
 * PowerSync uploads both rows, a Postgres trigger hands the placeholder to the AI worker, and the worker streams the
 * reply into it. This also works offline: the reply starts once the client reconnects and uploads.
 *
 * @returns The id of the chat, which is created when `chatId` is `null`.
 */
export async function sendMessage(db: AbstractPowerSyncDatabase, chatId: string | null, text: string) {
  const id = chatId ?? crypto.randomUUID();
  const now = Date.now();
  const askedAt = new Date(now).toISOString();
  // One millisecond later, so the reply sorts after the question.
  const placeholderAt = new Date(now + 1).toISOString();

  await db.writeTransaction(async (tx) => {
    if (chatId) {
      await tx.execute('UPDATE chats SET updated_at = ? WHERE id = ?', [askedAt, id]);
    } else {
      await tx.execute('INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)', [
        id,
        titleFor(text),
        askedAt,
        askedAt
      ]);
    }
    await tx.execute(
      `INSERT INTO messages (id, chat_id, role, content, status, created_at) VALUES (uuid(), ?, 'user', ?, 'done', ?)`,
      [id, text, askedAt]
    );
    await tx.execute(
      `INSERT INTO messages (id, chat_id, role, content, status, created_at) VALUES (uuid(), ?, 'assistant', '', 'pending', ?)`,
      [id, placeholderAt]
    );
  });

  return id;
}

/** Stops a reply. The worker notices on its next write to the row and cancels generation. */
export async function stopReply(db: AbstractPowerSyncDatabase, messageId: string) {
  await db.execute(`UPDATE messages SET status = 'stopped' WHERE id = ? AND status IN ('pending', 'streaming')`, [
    messageId
  ]);
}

/** Generates a reply again. Setting it back to 'pending' notifies the worker, just like a new placeholder. */
export async function retryReply(db: AbstractPowerSyncDatabase, messageId: string) {
  await db.execute(`UPDATE messages SET status = 'pending', content = '' WHERE id = ?`, [messageId]);
}

export async function deleteChat(db: AbstractPowerSyncDatabase, chatId: string) {
  await db.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM messages WHERE chat_id = ?', [chatId]);
    await tx.execute('DELETE FROM chats WHERE id = ?', [chatId]);
  });
}

function titleFor(text: string) {
  const title = text.replace(/\s+/g, ' ').trim();
  return title.length > 60 ? `${title.slice(0, 57)}…` : title;
}
