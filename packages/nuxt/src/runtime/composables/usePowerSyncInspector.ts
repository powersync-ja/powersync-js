import { DiagnosticsAppSchema } from '../utils/AppSchema'
import { RecordingStorageAdapter } from '../utils/RecordingStorageAdapter'
import { DynamicSchemaManager } from '../utils/DynamicSchemaManager'

// Global variable to store schema manager during construction
let currentSchemaManager: DynamicSchemaManager | null = null

function getCurrentSchemaManager() {
  if (currentSchemaManager) {
    return currentSchemaManager
  }
  currentSchemaManager = new DynamicSchemaManager()
  return currentSchemaManager
}

/**
 * A composable for setting up PowerSync Inspector functionality.
 * 
 * This composable provides utilities for schema management and diagnostics setup.
 * It exposes the diagnostics schema and internal utilities needed for the inspector.
 * 
 * @returns An object containing:
 * - `diagnosticsSchema` - The schema for diagnostics data collection. Use this to extend your app schema with diagnostic tables.
 * - `RecordingStorageAdapter` - Used internally. Storage adapter class that records operations for diagnostic purposes.
 * - `getCurrentSchemaManager()` - Used internally. Gets the current schema manager instance for dynamic schema operations.
 * 
 * @example
 * ```typescript
 * const { diagnosticsSchema } = usePowerSyncInspector()
 * 
 * // Combine with your app schema
 * const combinedSchema = new Schema([
 *   ...yourAppSchema.tables,
 *   ...diagnosticsSchema.tables,
 * ])
 * ```
 */
export function usePowerSyncInspector() {
  const diagnosticsSchema = DiagnosticsAppSchema

  return {
    diagnosticsSchema,
    RecordingStorageAdapter,
    getCurrentSchemaManager,
  }
}
