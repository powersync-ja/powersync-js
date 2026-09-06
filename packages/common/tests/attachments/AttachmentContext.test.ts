import { describe, expect, it, vi } from 'vitest';
import { AttachmentContext } from '../../src/attachments/AttachmentContext.js';
import { AttachmentState } from '../../src/attachments/Schema.js';

const logger = { log: () => {} };

function createContext(archivedRows: any[], archivedCacheLimit = 100) {
  const db = {
    getAll: vi.fn(async () => archivedRows),
    execute: vi.fn(async () => ({}))
  };

  const context = new AttachmentContext(db as any, 'attachments', logger, archivedCacheLimit);
  return { db, context };
}

function archivedRow(id: string) {
  return {
    id,
    filename: `${id}.jpg`,
    local_uri: null,
    size: null,
    media_type: null,
    timestamp: 1,
    state: AttachmentState.ARCHIVED,
    has_synced: 0,
    meta_data: null
  };
}

describe('AttachmentContext', () => {
  describe('deleteArchivedAttachments', () => {
    it('reports completion when there is nothing to delete', async () => {
      const { db, context } = createContext([]);
      const callback = vi.fn(async () => {});

      expect(await context.deleteArchivedAttachments(callback)).toBe(true);
      expect(callback).not.toHaveBeenCalled();
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('reports completion after deleting a partial page', async () => {
      const { db, context } = createContext([archivedRow('a'), archivedRow('b')]);
      const callback = vi.fn(async () => {});

      expect(await context.deleteArchivedAttachments(callback)).toBe(true);
      expect(callback).toHaveBeenCalledOnce();
      expect(db.execute).toHaveBeenCalledOnce();
    });
  });
});
