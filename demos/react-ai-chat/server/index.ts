import express from 'express';
import { authenticate, issueToken } from './auth.ts';
import { missingKeyVariable, modelId } from './model.ts';
import { resumeReplies, STREAM_MODE, streaming } from './replies.ts';
import { sendReply } from './stream-sse.ts';
import { summary as throttleSummary } from './throttle.ts';
import { upload } from './upload.ts';

/** The backend's port. The app's dev server proxies `/api` to it (see vite.config.mts). */
const PORT = 6060;

const app = express();
// Room for long messages, and for deleting a chat with many messages. An upload over the limit fails on every retry.
app.use(express.json({ limit: '10mb' }));

// A token for the user id the app made up, for PowerSync and for the requests below. See auth.ts.
app.post('/api/auth/token', async (req, res) => {
  const userId = req.body?.user_id;
  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({ error: 'Expected a user_id' });
    return;
  }
  res.json(await issueToken(userId));
});

// The app's local changes, which PowerSync uploads one transaction at a time.
app.post('/api/upload', authenticate, upload);

// SSE mode: replies stream to the app over this route while they generate.
if (STREAM_MODE === 'sse') app.get('/api/replies/:id/stream', authenticate, sendReply);

// Before listening, so that an upload can't start a reply that is also being resumed.
await resumeReplies();

await new Promise<void>((resolve, reject) =>
  app.listen(PORT, '127.0.0.1', (error) => (error ? reject(error) : resolve()))
);

console.log(
  missingKeyVariable
    ? `Backend listening on port ${PORT}. Simulating replies, because ${missingKeyVariable} is not set for ${modelId}.`
    : `Backend listening on port ${PORT}, replying with ${modelId}.`,
  streaming.summary,
  throttleSummary
);
