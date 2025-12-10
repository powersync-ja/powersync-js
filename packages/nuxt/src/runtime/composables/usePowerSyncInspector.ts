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

export function usePowerSyncInspector() {
  const diagnosticsSchema = DiagnosticsAppSchema

  return {
    diagnosticsSchema,
    RecordingStorageAdapter,
    getCurrentSchemaManager,
  }
}
