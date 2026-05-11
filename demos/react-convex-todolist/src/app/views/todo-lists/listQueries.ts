import type { ListRecord } from '@/library/powersync/AppSchema';
import { LISTS_TABLE, TODOS_TABLE } from '@/library/powersync/AppSchema';

/** One list row plus aggregate todo counts (same shape as the main board query). */
export type TodoListWithCountsRow = ListRecord & {
  total_tasks: number;
  completed_tasks: number;
};

const LIST_SELECT_AND_JOIN = `
  SELECT
    ${LISTS_TABLE}.*,
    COUNT(${TODOS_TABLE}.id) AS total_tasks,
    SUM(CASE WHEN ${TODOS_TABLE}.completed = true THEN 1 ELSE 0 END) AS completed_tasks
  FROM ${LISTS_TABLE}
  LEFT JOIN ${TODOS_TABLE} ON ${LISTS_TABLE}.id = ${TODOS_TABLE}.list_uuid
`;

/** All lists with per-list todo counts (main index). Higher priority first, then name. */
export const ALL_LIST_ROWS_WITH_COUNTS_SQL = `${LIST_SELECT_AND_JOIN} GROUP BY ${LISTS_TABLE}.id
  ORDER BY ${LISTS_TABLE}.priority DESC, ${LISTS_TABLE}.name COLLATE NOCASE`;

/** Archived lists only, with the same aggregate columns. */
export const ARCHIVED_LIST_ROWS_WITH_COUNTS_SQL = `${LIST_SELECT_AND_JOIN}
  WHERE COALESCE(${LISTS_TABLE}.archived, 0) = 1
  GROUP BY ${LISTS_TABLE}.id
  ORDER BY ${LISTS_TABLE}.priority DESC, ${LISTS_TABLE}.name COLLATE NOCASE`;
