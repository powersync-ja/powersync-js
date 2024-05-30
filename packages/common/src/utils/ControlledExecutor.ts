export interface ControlledExecutorOptions {
  /**
   * If throttling is enabled, it ensures only one task runs at a time,
   * and only one additional task can be scheduled to run after the current task completes. The pending task will be overwritten by the latest task.
   * Enabled by default.
   */
  throttleEnabled?: boolean;
}

export class ControlledExecutor<T> {
  private task: (param: T) => Promise<void> | void;

  /**
   * Represents the currently running task, which could be a Promise or undefined if no task is running.
   */
  private runningTask: undefined | (Promise<void> | void);

  private pendingTaskParam: T | undefined;

  /**
   * Flag to determine if throttling is enabled, which controls whether tasks are queued or run immediately.
   */
  private isThrottling: boolean;

  private closed: boolean;

  constructor(task: (param: T) => Promise<void> | void, options?: ControlledExecutorOptions) {
    this.task = task;
    const { throttleEnabled = true } = options ?? {};
    this.isThrottling = throttleEnabled;
    this.closed = false;
  }

  schedule(param: T) {
    if (this.closed) {
      return;
    }
    if (!this.isThrottling) {
      this.task(param);
      return;
    }

    if (this.runningTask) {
      // set or replace the pending task param with latest one
      this.pendingTaskParam = param;
      return;
    }

    this.execute(param);
  }

  dispose() {
    this.closed = true;

    if (this.runningTask) {
      this.runningTask = undefined;
    }
  }

  private async execute(param: T) {
    this.runningTask = this.task(param);
    await this.runningTask;
    this.runningTask = undefined;

    if (this.pendingTaskParam) {
      const pendingParam = this.pendingTaskParam;
      this.pendingTaskParam = undefined;

      this.execute(pendingParam);
    }
  }
}
