import { describe, expect, it } from 'vitest';
import { AttachmentQueue } from '../../src/attachments/AttachmentQueue.js';

describe('AttachmentQueue', () => {
  describe('expireCache', () => {
    it('stops once there is nothing archived left to delete', async () => {
      let queries = 0;
      const db = {
        logger: { log: () => {} },
        createMutex: () => ({ runExclusive: (fn: () => any) => Promise.resolve(fn()) }),
        getAll: async () => {
          // Bounded so that a loop which never terminates fails the test instead of hanging it.
          if (++queries > 3) throw new Error('expireCache kept querying for archived attachments');
          return [];
        },
        execute: async () => ({})
      };

      const queue = new AttachmentQueue({
        db: db as any,
        localStorage: {} as any,
        remoteStorage: {} as any,
        watchAttachments: () => {}
      });

      await expect(queue.expireCache()).resolves.toBeUndefined();
      expect(queries).toBe(1);
    });
  });
});
