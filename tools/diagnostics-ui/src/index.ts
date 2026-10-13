export { default as DiagnosticsPanel } from './components/DiagnosticsPanel.vue';
export {
  provideDiagnostics,
  useDiagnostics,
  useIntegration,
  SETUP_SDKS,
  type ProvideDiagnosticsOptions,
  type SetupSdk
} from './composables/diagnostics';
export { useTheme, type DiagnosticsTheme } from './composables/theme';
