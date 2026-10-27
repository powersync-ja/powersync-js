/**
 * PowerSync DevTools for React Native apps, as a Rozenite plugin: a panel in React Native DevTools and
 * agent tools for Rozenite's agent CLI. Production bundles get a no-op: the `require` below sits
 * behind a check bundlers resolve at build time, so the DevTools code is left out.
 */
import type { CommonPowerSyncDatabase } from '@powersync/common';

export let usePowerSyncDevTools: (database: CommonPowerSyncDatabase) => void;

if (process.env.NODE_ENV !== 'production') {
  usePowerSyncDevTools = require('./react-native/usePowerSyncDevTools.js').usePowerSyncDevTools;
} else {
  usePowerSyncDevTools = () => {};
}
