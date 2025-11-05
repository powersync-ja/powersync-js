/**
 * Implementations of the system dependencies for the PowerSync client.
 */
export type SystemDependencies = {
  fetch: typeof fetch;
  ReadableStream: typeof ReadableStream;
  TextDecoder: typeof TextDecoder;
};

export const DEFAULT_SYSTEM_DEPENDENCIES = (): SystemDependencies => {
  if (typeof fetch == `undefined`) {
    throw new Error(`fetch is not defined`);
  }
  if (typeof ReadableStream == `undefined`) {
    throw new Error(`ReadableStream is not defined`);
  }
  if (typeof TextDecoder == `undefined`) {
    throw new Error(`TextDecoder is not defined`);
  }

  return {
    fetch: fetch,
    ReadableStream: ReadableStream,
    TextDecoder: TextDecoder
  };
};
