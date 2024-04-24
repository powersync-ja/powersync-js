import { AbstractPowerSyncDatabase } from '@powersync/common';
import { App, MaybeRef, Ref, inject, provide, ref, hasInjectionContext } from 'vue';
import { setupTopLevelWarningMessage } from './messages';

// Create a unique symbol for the PowerSync context
const PowerSyncKey = Symbol();

/**
 * Create a Vue plugin to define the PowerSync client.
 * Client will be provided app-wide (highest position in component hierarchy).
 *
 * Needs to be installed on a Vue instance using `app.use()`.
 */
export function createPowerSyncPlugin(powerSyncPluginOptions: { database: MaybeRef<AbstractPowerSyncDatabase> }) {
  const install = (app: App) => {
    app.provide(PowerSyncKey, ref(powerSyncPluginOptions.database));
  };
  return { install };
}

/**
 * Provide the PowerSync client for all the caller component's descendants.
 * This function works on a hierarchical basis, meaning that the client provided by `providePowerSync` in a child component will override the client provided by `createPowerSyncPlugin` in a parent component.
 * If `createPowerSyncPlugin` was used to provide an app-wide client, all `providePowerSync` invocations are below it in the hierarchy.
 *
 * If the key parameter is provided, the client will be provided under that key instead of the default PowerSync key.
 */
export function providePowerSync(database: MaybeRef<AbstractPowerSyncDatabase>, key: string | undefined = undefined) {
  provide(key || PowerSyncKey, ref(database));
}

/**
 * Retrieve the nearest PowerSync client from the component hierarchy.
 * The client can be provided by using the `createPowerSyncPlugin` function to provide an app-wide client or by using the `providePowerSync` function in an ancestor component.
 * If multiple clients are found in the hierarchy, the closest client to the current component will be used.
 *
 * If the key parameter is provided, the nearest client under that key will be retrieved.
 *
 * @returns The PowerSync client if found, otherwise undefined.
 */
export const usePowerSync = (key: string | undefined = undefined) => {
  if (!hasInjectionContext()) {
    throw setupTopLevelWarningMessage;
  }
  const powerSync = inject<Ref<AbstractPowerSyncDatabase> | undefined>(key || PowerSyncKey);

  if (!powerSync) {
    console.warn('[PowerSync warn]: No PowerSync client found.');
  }

  return powerSync;
};
