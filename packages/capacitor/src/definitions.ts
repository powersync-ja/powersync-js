export interface PowerSyncPlugin {
  registerCore(): Promise<void>;
}
