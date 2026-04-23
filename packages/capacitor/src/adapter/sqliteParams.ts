export type IOSSqliteBufferParam = Record<string, number>;

export type NormalizedIOSSqliteParam = unknown | IOSSqliteBufferParam;

export function normalizeIOSSqliteParams(params: unknown[]): NormalizedIOSSqliteParam[] {
  return params.map((param) => normalizeIOSSqliteParam(param));
}

function normalizeIOSSqliteParam(value: unknown): NormalizedIOSSqliteParam {
  if (value instanceof Uint8Array) {
    return uint8ArrayToIOSBuffer(value);
  }

  if (value instanceof ArrayBuffer) {
    return uint8ArrayToIOSBuffer(new Uint8Array(value));
  }

  if (ArrayBuffer.isView(value)) {
    return uint8ArrayToIOSBuffer(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }

  return value;
}

function uint8ArrayToIOSBuffer(array: Uint8Array): IOSSqliteBufferParam {
  // The Capacitor SQLite iOS bridge expects BLOB params as an index-keyed object
  // with integer values. It does not accept typed arrays directly.
  const result: IOSSqliteBufferParam = {};
  for (let i = 0; i < array.length; i++) {
    result[String(i)] = array[i];
  }
  return result;
}
