import { describe, expect, test } from 'vitest';
import {
  DEFAULT_ROW_COMPARATOR,
  DifferentialQueryProcessor
} from '../../../src/client/watched/DifferentialQueryProcessor.js';

// Constructing a processor requires a database, so we call differentiate directly.
function differentiate(rows: any[], previous: Map<string, any>, comparator = DEFAULT_ROW_COMPARATOR) {
  return (DifferentialQueryProcessor.prototype as any).differentiate.call({ comparator }, rows, previous);
}

describe('DifferentialQueryProcessor', () => {
  test('reports reordered rows as a change', () => {
    const initial = differentiate([{ id: 'a' }, { id: 'b' }], new Map());
    const reordered = differentiate([{ id: 'b' }, { id: 'a' }], initial.map);

    expect(reordered.hasChanged).toBe(true);
    expect(reordered.diff.all.map((row) => row.id)).toEqual(['b', 'a']);
    expect(reordered.diff.added).toHaveLength(0);
    expect(reordered.diff.removed).toHaveLength(0);
    expect(reordered.diff.updated).toHaveLength(0);

    // The new order is used for subsequent comparisons
    const again = differentiate([{ id: 'b' }, { id: 'a' }], reordered.map);
    expect(again.hasChanged).toBe(false);
  });

  test('does not report a change for the same rows in the same order', () => {
    const initial = differentiate([{ id: 'a' }, { id: 'b' }], new Map());
    const next = differentiate([{ id: 'a' }, { id: 'b' }], initial.map);

    expect(next.hasChanged).toBe(false);
    // Unchanged rows keep their previous object references
    expect(next.diff.all).toEqual(initial.diff.all);
    expect(next.diff.all[0]).toBe(initial.diff.all[0]);
  });

  test('handles rows with duplicate keys', () => {
    // Without an id, the default comparator keys rows by their content
    const initial = differentiate([{ name: 'y' }, { name: 'x' }, { name: 'x' }], new Map());

    const same = differentiate([{ name: 'y' }, { name: 'x' }, { name: 'x' }], initial.map);
    expect(same.hasChanged).toBe(false);

    const reordered = differentiate([{ name: 'x' }, { name: 'y' }, { name: 'x' }], initial.map);
    expect(reordered.hasChanged).toBe(true);
  });
});
