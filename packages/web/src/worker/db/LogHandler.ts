import { BaseListener, BaseObserver } from '@powersync/common';

export type LogEvent = {
  loggerName: string;
  logLevel: string;
  messages: string[];
};

export interface LogHandlerListener extends BaseListener {
  onLog: (event: LogEvent) => void;
}

export class LogHandler extends BaseObserver<LogHandlerListener> {
  pushLog(entry: LogEvent) {
    this.iterateListeners((l) => l.onLog?.(entry));
  }
}
