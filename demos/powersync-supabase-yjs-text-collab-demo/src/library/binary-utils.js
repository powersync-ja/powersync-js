export function b64ToUint8Array(base64) {
  const asCharCode = (c) => c.charCodeAt(0);
  return Uint8Array.from(atob(base64), asCharCode);
}

export function Uint8ArrayTob64(uint8array) {
  const output = [];
  for (let i = 0, { length } = uint8array; i < length; i++) output.push(String.fromCharCode(uint8array[i]));
  return btoa(output.join(''));
}

export function Uint8ArrayToHex(uint8array) {
  return '\\x' + uint8array.reduce((s, n) => s + n.toString(16).padStart(2, '0'), '');
}

export function b64ToHex(str) {
  const raw = atob(str);
  let result = '\\x';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += hex.length === 2 ? hex : '0' + hex;
  }
  return result;
}

export function hexToUint8Array(hexString) {
  return Uint8Array.from(
    hexString
      .replace('\\x', '')
      .match(/.{1,2}/g)
      .map((byte) => parseInt(byte, 16))
  );
}
