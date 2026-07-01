export class PreparedStatementCache {
  readonly #size: number;
  // Note that Map preserves insertion order, which allows using it as an LRU
  // cache (with the first element being the first element to evict).
  readonly #statements = new Map<string, number>();

  constructor(size: number) {
    this.#size = size;
  }

  /**
   * Attempts to look up the cached sql statement, if it's currently cached.
   */
  lookup(sql: string): number | null {
    const foundStatement = this.#statements.get(sql);
    if (foundStatement != null) {
      // Insert again to mark it as used.
      this.#statements.set(sql, foundStatement);
      return foundStatement;
    }

    return null;
  }

  /**
   * Adds a new statement into the cache.
   *
   * If that exceeds the target size of the statement cache, returns an old statement to evict.
   * The caller is responsible for freeing that statement.
   */
  addStatement(sql: string, statement: number): number | null {
    this.#statements.set(sql, statement);

    if (this.#statements.size > this.#size) {
      for (const [k, v] of this.#statements.entries()) {
        this.#statements.delete(k);
        return v;
      }
    }

    return null;
  }

  drain(): number[] {
    const values = [...this.#statements.values()];
    this.#statements.clear();
    return values;
  }
}
