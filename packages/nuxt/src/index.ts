/**
 * @packageDocumentation
 *
 * PowerSync Nuxt Module - Public API
 *
 * This module provides PowerSync integration for Nuxt applications with built-in diagnostics
 * and inspector capabilities.
 */

// Module Options
export type { PowerSyncNuxtModuleOptions } from './module.js';

// Database Class
export { NuxtPowerSyncDatabase } from './runtime/utils/NuxtPowerSyncDatabase.js';

// Composables
export { usePowerSyncKysely } from './runtime/composables/usePowerSyncKysely.js';
export { useDiagnosticsLogger } from './runtime/composables/useDiagnosticsLogger.js';
export { usePowerSyncInspector } from './runtime/composables/usePowerSyncInspector.js';
export { usePowerSyncInspectorDiagnostics } from './runtime/composables/usePowerSyncInspectorDiagnostics.js';
export type {
  UsePowerSyncInspectorDiagnosticsReturn,
  UsePowerSyncInspectorDiagnosticsTotals
} from './runtime/composables/usePowerSyncInspectorDiagnostics.js';
