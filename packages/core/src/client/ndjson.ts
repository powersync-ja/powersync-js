import type { SystemDependencies } from './SystemDependencies.js';

export function ndjsonStream<T>(
  response: ReadableStream<Uint8Array>,
  systemDependencies: SystemDependencies
): ReadableStream<T> {
  let is_reader: any,
    cancellationRequest = false;
  const { ReadableStream, TextDecoder } = systemDependencies;
  return new ReadableStream<T>({
    start: function (controller) {
      const reader = response.getReader();
      is_reader = reader;
      const decoder = new TextDecoder();
      let data_buf = ``;

      reader
        .read()
        .then(function processResult(result): void | Promise<any> {
          if (result.done) {
            if (cancellationRequest) {
              // Immediately exit
              return;
            }

            data_buf = data_buf.trim();
            if (data_buf.length !== 0) {
              try {
                const data_l = JSON.parse(data_buf);
                controller.enqueue(data_l);
              } catch (e) {
                controller.error(e);
                return;
              }
            }
            controller.close();
            return;
          }

          const data = decoder.decode(result.value, { stream: true });
          data_buf += data;
          const lines = data_buf.split(`\n`);
          for (let i = 0; i < lines.length - 1; ++i) {
            const l = lines[i]?.trim() || ``;
            if (l.length > 0) {
              try {
                const data_line = JSON.parse(l);
                controller.enqueue(data_line);
              } catch (e) {
                controller.error(e);
                cancellationRequest = true;
                reader.cancel();
                return;
              }
            }
          }
          data_buf = lines[lines.length - 1] || ``;

          return reader.read().then(processResult);
        })
        .catch((e) => {
          controller.error(e);
        });
    },
    cancel: function () {
      cancellationRequest = true;
      is_reader.cancel();
    }
  });
}
