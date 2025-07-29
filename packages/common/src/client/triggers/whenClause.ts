function sanitizeString(input: string): string {
  return `'${input.replace(/'/g, "''")}'`;
}
/**
 * Helper function for sanitizing UUID input strings.
 * Typically used with {@link whenClause}.
 */
export function sanitizeUUID(uuid: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(uuid);
  if (!isValid) {
    throw new Error(`${uuid} is not a valid UUID`);
  }
  return uuid;
}

/**
 * SQL string template function for {@link TrackDiffOptions#when} and {@link CreateDiffTriggerOptions#when}.
 *
 * This function performs basic string interpolation for SQLite WHEN clauses.
 *
 * **String placeholders:**
 * - All string values passed as placeholders are automatically wrapped in single quotes (`'`).
 * - Do not manually wrap placeholders in single quotes in your template string; the function will handle quoting and escaping for you.
 * - Any single quotes within the string value are escaped by doubling them (`''`), as required by SQL syntax.
 *
 * **Other types:**
 * - `null` and `undefined` are converted to SQL `NULL`.
 * - Objects are stringified using `JSON.stringify()` and wrapped in single quotes, with any single quotes inside the stringified value escaped.
 * - Numbers and other primitive types are inserted directly.
 *
 * **Usage example:**
 * ```typescript
 * const myID = "O'Reilly";
 * const clause = whenClause`New.id = ${myID}`;
 * // Result: "New.id = 'O''Reilly'"
 * ```
 *
 * Avoid manually quoting placeholders:
 * ```typescript
 * // Incorrect:
 * whenClause`New.id = '${myID}'` // Produces double quotes: New.id = ''O''Reilly''
 * ```
 */
export function whenClause(strings: TemplateStringsArray, ...values: any[]): string {
  let result = '';
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      // For SQL, escape single quotes in string values
      const value = values[i];
      if (typeof value === 'string') {
        result += sanitizeString(value);
      } else if (value === null || value === undefined) {
        result += 'NULL';
      } else if (typeof value == 'object') {
        // Stringify the object and escape single quotes in the result
        const stringified = JSON.stringify(value);
        result += sanitizeString(stringified);
      } else {
        result += value;
      }
    }
  });
  return result;
}
