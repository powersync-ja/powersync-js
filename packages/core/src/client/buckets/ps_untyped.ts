/**
 * ps_untyped table interface
 *
 * Purpose: Temporary storage for untyped data before schema is applied
 *
 * Schema:
 * - type (TEXT NOT NULL)
 * - id (TEXT NOT NULL)
 * - data (TEXT)
 *
 * PRIMARY KEY (type, id)
 */
export interface PSUntyped {
  /** TEXT NOT NULL */
  type: string;

  /** TEXT NOT NULL */
  id: string;

  /** TEXT */
  data: string | null;
}
