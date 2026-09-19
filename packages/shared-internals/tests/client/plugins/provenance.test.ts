import { describe, expect, it, vi } from 'vitest';
import { OnChangeQueryProcessor } from '../../../src/client/watched/OnChangeQueryProcessor.js';
import { createStubQuery, createTestProcessorHost } from './harness.js';

describe('watched query provenance', () => {
  it('starts as placeholder with null sourceMeta', async () => {
    const { db } = createTestProcessorHost();
    const processor = new OnChangeQueryProcessor<string[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('SELECT 1', () => ['a']) }
    });

    expect(processor.state.source).toBe('placeholder');
    expect(processor.state.sourceMeta).toBeNull();
    await processor.close();
  });

  it('reports live once the query resolves', async () => {
    const { db } = createTestProcessorHost();
    const processor = new OnChangeQueryProcessor<string[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('SELECT 1', () => ['a']) }
    });

    await vi.waitFor(() => expect(processor.state.data).toEqual(['a']));
    expect(processor.state.source).toBe('live');
    expect(processor.state.sourceMeta).toBeNull();
    await processor.close();
  });
});
