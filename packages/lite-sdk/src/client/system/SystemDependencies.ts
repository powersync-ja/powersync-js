export interface Crypto {
  randomUUID: () => string;
}

/**
 * Implementations of the system dependencies for the PowerSync client.
 */
export type SystemDependencies = {
  fetch: typeof fetch;
  ReadableStream: typeof ReadableStream;
  TextDecoder: typeof TextDecoder;
  crypto: Crypto;
};

export const DEFAULT_SYSTEM_DEPENDENCIES = (): SystemDependencies => {
  const errors: string[] = [];
  if (typeof fetch == `undefined`) {
    errors.push(`fetch is not defined`);
  }
  if (typeof ReadableStream == `undefined`) {
    errors.push(`ReadableStream is not defined`);
  }
  if (typeof TextDecoder == `undefined`) {
    errors.push(`TextDecoder is not defined`);
  }
  if (typeof crypto == `undefined`) {
    errors.push(`crypto is not defined`);
  }

  if (errors.length > 0) {
    throw new Error(`Missing system dependencies: ${errors.join(`, `)}`);
  }

  return {
    fetch: fetch,
    ReadableStream: ReadableStream,
    TextDecoder: TextDecoder,
    crypto: crypto
  };
};
