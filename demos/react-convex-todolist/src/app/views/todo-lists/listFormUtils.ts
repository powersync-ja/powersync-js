/** Task counts line for a list row (used on the board and archived view). */
export function formatListTaskSummary(total: number, completed: number = 0): string {
  return `${total - completed} pending, ${completed} completed`;
}

/** Default `lists.priority` for newly created lists (Low). */
export const DEFAULT_NEW_LIST_PRIORITY = 1;

/** SQLite `lists.priority` → UI label */
export const LIST_PRIORITY_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' }
] as const;

/** Line shown on list rows (always includes a level, including none). */
export function listPriorityCaption(priority: number | null | undefined): string {
  const v = priority ?? 0;
  const row = LIST_PRIORITY_OPTIONS.find((o) => o.value === v);
  if (!row) return `Priority level ${v}`;
  return `Priority: ${row.label.toLowerCase()}`;
}

/** Ordered tag strings for UI (JSON array in DB). */
export function tagsJsonToStringArray(tags: string | null | undefined): string[] {
  if (!tags?.trim()) return [];
  try {
    const parsed = JSON.parse(tags) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function stringArrayToTagsJson(tags: string[]): string {
  const next = tags.map((t) => t.trim()).filter(Boolean);
  return JSON.stringify(next);
}

/** Single-letter / dash labels for compact priority controls. */
export const LIST_PRIORITY_COMPACT: Record<number, string> = {
  0: '—',
  1: 'L',
  2: 'M',
  3: 'H'
};
