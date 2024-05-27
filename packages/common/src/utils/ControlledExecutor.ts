export interface ControlledExecutorOptions {
  /**
   * If throttling is enabled, it ensures only one task runs at a time,
   * and only one additional task can be scheduled to run after the current task completes.
   * Enabled by default.
   */
  enableThrottle?: boolean;
}

export class ControlledExecutor {
  private task: () => Promise<void> | void;

  /**
   * Represents the currently running task, which could be a Promise or undefined if no task is running.
   */
  private runningTask: undefined | (Promise<void> | void);

  private hasPendingTask: boolean;

  /**
   * Flag to determine if throttling is enabled, which controls whether tasks are queued or run immediately.
   */
  private isThrottling: boolean;

  private closed: boolean;

  constructor(task: () => Promise<void> | void, options?: ControlledExecutorOptions) {
    this.task = task;
    const { enableThrottle = true } = options ?? {};
    this.isThrottling = enableThrottle;
    this.closed = false;
  }

  schedule() {
    if (this.closed) {
      throw new Error('Failed to schedule execution, executor is closed.');
    }
    if (!this.isThrottling) {
      this.task();
      return;
    }

    if (this.runningTask) {
      this.hasPendingTask = true;
      return;
    }

    this.execute();
  }

  dispose() {
    this.closed = true;

    if (this.runningTask) {
      this.runningTask = undefined;
    }
  }

  private async execute() {
    this.runningTask = this.task();
    await this.runningTask;
    this.runningTask = undefined;

    if (this.hasPendingTask) {
      this.hasPendingTask = false;
      this.execute();
    }
  }
}
