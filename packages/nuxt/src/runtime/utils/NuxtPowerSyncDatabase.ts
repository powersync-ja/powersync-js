import {
  PowerSyncDatabase,
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
} from '@powersync/web'
import { RecordingStorageAdapter } from './RecordingStorageAdapter'
import type { DynamicSchemaManager } from './DynamicSchemaManager'
import { usePowerSyncInspector } from '../composables/usePowerSyncInspector'
import { useDiagnosticsLogger } from '../composables/useDiagnosticsLogger'
import { ref, type Ref } from 'vue'
import { useRuntimeConfig } from '#app'
import { RustClientInterceptor } from './RustClientInterceptor'

export class NuxtPowerSyncDatabase extends PowerSyncDatabase {
  private schemaManager!: DynamicSchemaManager
  private _connector: PowerSyncBackendConnector | null = null
  private _connectionOptions: PowerSyncConnectionOptions | null = null
  private useDiagnostics: boolean = false

  get dbOptions(): WebPowerSyncDatabaseOptions {
    return this.options
  }

  override get connector() {
    return this._connector ?? super.connector
  }

  override get connectionOptions() {
    return this._connectionOptions ?? super.connectionOptions
  }

  constructor(options: WebPowerSyncDatabaseOptions) {
    const useDiagnostics = useRuntimeConfig().public.powerSyncModuleOptions.useDiagnostics ?? false
    if (useDiagnostics) {
      const { logger } = useDiagnosticsLogger()
      const { getCurrentSchemaManager } = usePowerSyncInspector()
      // Create schema manager before calling super
      const currentSchemaManager = getCurrentSchemaManager()

      // override settings to disable multitab as we can't use it right now
      // options.flags = {
      //   ...options.flags,
      //   enableMultiTabs: true, // to support multitabe we need to write our won worker implementation
      //   broadcastLogs: true, // need to be enabled for multitab support
      // }

      // @ts-expect-error - type error because we are forcing the vfs to be the OPFSCoopSyncVFS
      options.vfs = WASQLiteVFS.OPFSCoopSyncVFS
      // override logger to use the logger from the utils/Logger.ts file
      options.logger = logger
      super(options)

      // Set instance property and clear global
      this.schemaManager = currentSchemaManager
      this.useDiagnostics = true
    }
    else {
      super(options)
      this.useDiagnostics = false
    }
  }

  protected override generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions,
  ): StreamingSyncImplementation {
    if (this.useDiagnostics) {
      const { logger } = useDiagnosticsLogger()
      const { getCurrentSchemaManager } = usePowerSyncInspector()

      const currentSchemaManager = getCurrentSchemaManager()
      const schemaManager = currentSchemaManager || this.schemaManager

      const adapter = this.connectionOptions?.clientImplementation === SyncClientImplementation.JAVASCRIPT
        ? new RecordingStorageAdapter(
          ref(this) as Ref<PowerSyncDatabase>,
          ref(schemaManager) as Ref<DynamicSchemaManager>,
        )
        : new RustClientInterceptor(
          ref(this) as Ref<PowerSyncDatabase>,
          new WebRemote(connector, logger),
          ref(schemaManager) as Ref<DynamicSchemaManager>,
        )

      return new WebStreamingSyncImplementation({
        adapter,
        remote: new WebRemote(connector, logger),
        uploadCrud: async () => {
          await this.waitForReady()
          await connector.uploadData(this)
        },
        identifier:
        'dbFilename' in this.options.database
          ? this.options.database.dbFilename
          : 'diagnostics-sync',
        logger,
        ...options,
      })
    }
    else {
      return super.generateSyncStreamImplementation(connector, options)
    }
  }

  override async connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions) {
    // Override client implementation when in diagnostics
    this._connector = connector
    this._connectionOptions = options ?? null
    await super.connect(connector, options)
  }

  override async disconnect() {
    this._connector = null
    this._connectionOptions = null
    await super.disconnect()
  }

  override async disconnectAndClear(options?: DisconnectAndClearOptions) {
    this._connector = null
    this._connectionOptions = null
    await super.disconnectAndClear(options)
  }
}
