/** Rows fetched when a query has no LIMIT; one more than a view would show, so it can tell the result was cut. */
export const MAX_RESULT_ROWS = 500;

const hasLimitClause = (sql: string) => /\bLIMIT\s+\d+/i.test(sql);

/**
 * Appends a LIMIT when the query has none, so a stray `SELECT * FROM ps_oplog` typed into a console
 * cannot flood the page. Fetches one row more than `maxRows`, so a caller can detect a cut result.
 */
export function withAutoLimit(sql: string, maxRows = MAX_RESULT_ROWS): { sql: string; isAutoLimited: boolean } {
  if (hasLimitClause(sql)) {
    return { sql, isAutoLimited: false };
  }
  return { sql: `${sql.trim().replace(/;\s*$/, '')} LIMIT ${maxRows + 1}`, isAutoLimited: true };
}

/** Quotes an identifier for use in SQL typed on the user's behalf. */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
