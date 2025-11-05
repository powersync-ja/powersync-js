/**
 * ps_tx (Transactions) table interface
 *
 * Purpose: Tracks transaction state
 *
 * Schema:
 * - id (INTEGER PRIMARY KEY NOT NULL)
 * - current_tx (INTEGER)
 * - next_tx (INTEGER)
 */
export interface PSTx {
  /** INTEGER */
  current_tx: number | null;

  /** INTEGER */
  next_tx: number | null;
}
