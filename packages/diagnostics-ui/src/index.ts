export { default as DiagnosticsPanel } from './components/DiagnosticsPanel.vue';
export {
  provideDiagnostics,
  useDiagnostics,
  useIntegration,
  type ProvideDiagnosticsOptions
} from './composables/diagnostics';
export { useTheme, type DiagnosticsTheme } from './composables/theme';
