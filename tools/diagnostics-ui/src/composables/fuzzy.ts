import Fuse from 'fuse.js';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';

/**
 * Reusable fuzzy search over a reactive list (fuse.js). Returns a bindable `query` and the filtered
 * `results` (the full list when the query is empty). Used across Buckets / Streams / Data / Logs.
 */
export function useFuzzySearch<T>(items: MaybeRefOrGetter<readonly T[]>, keys: string[]) {
  const query = ref('');
  const list = computed(() => [...toValue(items)]);
  const fuse = computed(() => new Fuse(list.value, { keys, threshold: 0.4, ignoreLocation: true }));
  const results = computed<T[]>(() => {
    const q = query.value.trim();
    return q ? fuse.value.search(q).map((r) => r.item) : list.value;
  });
  return { query, results };
}
