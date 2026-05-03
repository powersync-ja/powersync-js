import { Capacitor } from '@capacitor/core';
import { WebRemote } from '@powersync/web';

export class CapacitorRemote extends WebRemote {
  protected get supportsStreamingBinaryResponses(): boolean {
    /**
     * We'd like to avoid passing Binary buffers to SQLite when using
     * iOS for now. This is due to inefficient binary processing.
     */
    return Capacitor.getPlatform() !== 'ios';
  }
}
