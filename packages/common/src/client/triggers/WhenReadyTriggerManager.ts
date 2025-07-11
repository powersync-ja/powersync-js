import { CreateDiffTriggerOptions, TriggerManager, TriggerRemoveCallback } from './TriggerManager.js';
import { TriggerManagerImpl } from './TriggerManagerImpl.js';

export interface WhenReadyTriggerManagerOptions {
  manager: TriggerManagerImpl;
  readyPromise: Promise<void>;
}

export class WhenReadyTriggerManager implements TriggerManager {
  protected readyPromise: Promise<void>;
  manager: TriggerManager;

  constructor(options: WhenReadyTriggerManagerOptions) {
    this.manager = options.manager;
    // Wait for the DB to be ready, then initialize the trigger manager.
    this.readyPromise = options.readyPromise;
  }

  async createDiffTrigger(options: CreateDiffTriggerOptions): Promise<TriggerRemoveCallback> {
    await this.readyPromise;
    return this.manager.createDiffTrigger(options);
  }
}
