import { expect, test } from 'vitest';
import { DifferentialQueryProcessor } from '../../../src/client/watched/DifferentialQueryProcessor.js';

type Row = { id: string; label: string };
type Entry = { hash: string; item: Row };
type Result = {
  diff: {
    all: Row[];
    added: Row[];
    removed: Row[];
    unchanged: Row[];
    updated: { current: Row; previous: Row }[];
  };
  map: Map<string, Entry>;
  hasChanged: boolean;
};
type Processor = {
  comparator: { keyBy: (row: Row) => string; compareBy: (row: Row) => string };
};

const comparator = {
  keyBy: (row: Row) => row.id,
  compareBy: (row: Row) => row.label
};

const differentiate = Reflect.get(DifferentialQueryProcessor.prototype, 'differentiate') as (
  this: Processor,
  current: Row[],
  previousMap: Map<string, Entry>
) => Result;

function run(current: Row[], previousMap: Map<string, Entry>): Result {
  return differentiate.call({ comparator }, current, previousMap);
}

test('emits a differential update when unchanged rows are returned in a new order', () => {
  const a = { id: 'a', label: 'A' };
  const b = { id: 'b', label: 'B' };
  const initial = run([a, b], new Map());

  expect(initial.hasChanged).toBe(true);

  const reordered = run([b, a], initial.map);

  expect(reordered.hasChanged).toBe(true);
  expect(reordered.diff.all.map((row) => row.id)).toEqual(['b', 'a']);
  expect(reordered.diff.unchanged).toEqual([b, a]);
});

test('does not emit when unchanged rows retain their order', () => {
  const a = { id: 'a', label: 'A' };
  const b = { id: 'b', label: 'B' };
  const initial = run([a, b], new Map());

  const unchanged = run([{ ...a }, { ...b }], initial.map);

  expect(unchanged.hasChanged).toBe(false);
  expect(unchanged.diff.all[0]).toBe(a);
  expect(unchanged.diff.all[1]).toBe(b);
});
