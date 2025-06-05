import { Dispatcher } from 'undici';

/**
 * A simple dispatcher wrapper that only records the last error.
 * Everything else passes straight through to the original handler.
 */
export class ErrorRecordingDispatcher extends Dispatcher {
  private targetDispatcher: Dispatcher;
  private onError: (error: Error) => void;

  constructor(targetDispatcher: Dispatcher, onError: (error: Error) => void) {
    super();
    this.targetDispatcher = targetDispatcher;
    this.onError = onError;
  }

  dispatch(opts: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandler): boolean {
    // Create a simple wrapper that only intercepts errors
    const errorRecordingHandler: Dispatcher.DispatchHandler = {
      // New API methods (preferred)
      onRequestStart: handler.onRequestStart?.bind(handler),
      onRequestUpgrade: handler.onRequestUpgrade?.bind(handler),
      onResponseStart: handler.onResponseStart?.bind(handler),
      onResponseData: handler.onResponseData?.bind(handler),
      onResponseEnd: handler.onResponseEnd?.bind(handler),

      onResponseError: (controller: any, error: Error) => {
        this.onError(error);
        // Pass through to original handler
        return handler.onResponseError?.(controller, error);
      },

      // Legacy API methods (for backward compatibility)
      onConnect: handler.onConnect?.bind(handler),
      onUpgrade: handler.onUpgrade?.bind(handler),
      onHeaders: handler.onHeaders?.bind(handler),
      onData: handler.onData?.bind(handler),
      onComplete: handler.onComplete?.bind(handler),

      onError: (error: Error) => {
        this.onError(error);

        // Pass through to original handler
        return handler.onError?.(error);
      }
    };

    // Delegate to the target dispatcher with our simple error-recording handler
    return this.targetDispatcher.dispatch(opts, errorRecordingHandler);
  }

  async close(): Promise<void> {
    return this.targetDispatcher.close();
  }

  async destroy(): Promise<void> {
    return this.targetDispatcher.destroy();
  }
}
