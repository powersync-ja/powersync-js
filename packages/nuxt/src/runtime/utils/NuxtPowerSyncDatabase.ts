import {
  DEFAULT_SYNC_CLIENT_IMPLEMENTATION,
  PowerSyncDatabase,
  Schema,
  SharedWebStreamingSyncImplementation,
  SyncClientImplementation,
  WASQLiteVFS,
  WebRemote,
  WebStreamingSyncImplementation,
  type DisconnectAndClearOptions,
  type PowerSyncBackendConnector,
  type PowerSyncConnectionOptions,
  type RequiredAdditionalConnectionOptions,
  type StreamingSyncImplementation,
  type WebPowerSyncDatabaseOptions,
  type WebDBAdapter
} from '@powersync/web';
import { RecordingStorageAdapter } from './RecordingStorageAdapter';
import type { DynamicSchemaManager } from './DynamicSchemaManager';
import { usePowerSyncInspector } from '../composables/usePowerSyncInspector';
import { useDiagnosticsLogger } from '../composables/useDiagnosticsLogger';
import { ref, type Ref } from 'vue';
import { useRuntimeConfig } from '#app';
import { RustClientInterceptor } from './RustClientInterceptor';

/**
 * An extended PowerSync database class that includes diagnostic capabilities for use with the PowerSync Inspector.
 *
 * This class automatically configures diagnostics when `useDiagnostics: true` is set in the module configuration.
 * It provides enhanced VFS support, schema management, and logging capabilities for the inspector.
 *
 * @example
 * ```typescript
 * import { NuxtPowerSyncDatabase } from '@powersync/nuxt'
 *
 * const db = new NuxtPowerSyncDatabase({
 *   database: {
 *     dbFilename: 'your-db-filename.sqlite',
 *   },
 *   schema: yourSchema,
 * })
 * ```
 *
 * @remarks
 * - When diagnostics are enabled, automatically uses cooperative sync VFS for improved compatibility
 * - Stores connector internally for inspector access
 * - Integrates with dynamic schema management for inspector features
 * - Automatically configures logging when diagnostics are enabled
 * - When diagnostics are disabled, behaves like a standard `PowerSyncDatabase`
 */
export class NuxtPowerSyncDatabase extends PowerSyncDatabase {
  private schemaManager!: DynamicSchemaManager;
  private _connector: PowerSyncBackendConnector | null = null;
  private _connectionOptions: PowerSyncConnectionOptions | null = null;
  private useDiagnostics: boolean = false;

  get dbOptions(): WebPowerSyncDatabaseOptions {
    return this.options;
  }

  override get connector() {
    return this._connector ?? super.connector;
  }

  override get connectionOptions() {
    return this._connectionOptions ?? super.connectionOptions;
  }

  constructor(options: WebPowerSyncDatabaseOptions) {
    const useDiagnostics = useRuntimeConfig().public.powerSyncModuleOptions.useDiagnostics ?? false;
    if (useDiagnostics) {
      const { logger } = useDiagnosticsLogger();
      const { getCurrentSchemaManager, diagnosticsSchema } = usePowerSyncInspector();
      // Create schema manager before calling super
      const currentSchemaManager = getCurrentSchemaManager();

      // we need to force multitabe as the devtools is basically another tab running in the same browser context
      options.flags = {
        ...options.flags,
        enableMultiTabs: true,
        broadcastLogs: true
      };

      // override logger to use the logger from the utils/Logger.ts file
      options.logger = logger;
      // add diagnostics schema to the app schema
      options.schema = new Schema([...options.schema.tables, ...diagnosticsSchema.tables]);
      super(options);

      // Set instance property and clear global
      this.schemaManager = currentSchemaManager;
      this.useDiagnostics = true;
    } else {
      super(options);
      this.useDiagnostics = false;
    }
  }

  protected override generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions
  ): StreamingSyncImplementation {
    if (this.useDiagnostics) {
      const { logger } = useDiagnosticsLogger();
      const { getCurrentSchemaManager } = usePowerSyncInspector();

      const currentSchemaManager = getCurrentSchemaManager();
      const schemaManager = currentSchemaManager || this.schemaManager;

      const clientImplementation = this.connectionOptions?.clientImplementation ?? DEFAULT_SYNC_CLIENT_IMPLEMENTATION;
      const adapter =
        clientImplementation === SyncClientImplementation.RUST
          ? new RustClientInterceptor(
              ref(this) as Ref<PowerSyncDatabase>,
              new WebRemote(connector, logger),
              ref(schemaManager) as Ref<DynamicSchemaManager>
            )
          : new RecordingStorageAdapter(
              ref(this) as Ref<PowerSyncDatabase>,
              ref(schemaManager) as Ref<DynamicSchemaManager>
            );

      if (this.options.flags?.enableMultiTabs) {
        if (!this.resolvedFlags.broadcastLogs) {
          const warning = `
            Multiple tabs are enabled, but broadcasting of logs is disabled.
            Logs for shared sync worker will only be available in the shared worker context
          `;
          logger ? logger.warn(warning) : console.warn(warning);
        }
        return new SharedWebStreamingSyncImplementation({
          ...options,
          adapter,
          remote: new WebRemote(connector, logger),
          uploadCrud: async () => {
            await this.waitForReady();
            await connector.uploadData(this);
          },
          logger,
          db: this.database as WebDBAdapter
        });
      } else {
        return new WebStreamingSyncImplementation({
          ...options,
          adapter,
          remote: new WebRemote(connector, logger),
          uploadCrud: async () => {
            await this.waitForReady();
            await connector.uploadData(this);
          },
          identifier: 'dbFilename' in this.options.database ? this.options.database.dbFilename : 'diagnostics-sync',
          logger
        });
      }
    } else {
      return super.generateSyncStreamImplementation(connector, options);
    }
  }

  override async connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions) {
    // Override client implementation when in diagnostics
    this._connector = connector;
    this._connectionOptions = options ?? null;
    await super.connect(connector, options);
  }

  override async disconnect() {
    this._connector = null;
    this._connectionOptions = null;
    await super.disconnect();
  }

  override async disconnectAndClear(options?: DisconnectAndClearOptions) {
    this._connector = null;
    this._connectionOptions = null;
    await super.disconnectAndClear(options);
  }
}
