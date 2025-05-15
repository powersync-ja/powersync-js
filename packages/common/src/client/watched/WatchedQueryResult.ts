export interface WatchedQueryDelta<T> {
  /**
   * Rows added since the previous result set
   */
  added: T[];
  /**
   * Rows removed since the previous result set
   */
  removed: T[];
  /**
   * Rows which have changed since the previous result set
   */
  updated: T[];
  /**
   * Rows which are unchanged since the previous result set
   */
  unchanged: T[];
}

export interface WatchedQueryResult<T> {
  /**
   * All the current rows in the result set
   */
  all: T[];

  /**
   * The delta since the last result set
   */
  delta(): WatchedQueryDelta<T>;
}
