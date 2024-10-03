// This file is based on code from the fast-base64-decode repository.
// Source: https://github.com/LinusU/fast-base64-decode/blob/master/index.js
// Modifications:
// - None

const lookup = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 62, 0, 62, 0, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 0, 0, 0, 0, 63, 0, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
]);

function base64Decode(source, target) {
  const sourceLength = source.length;
  const paddingLength = source[sourceLength - 2] === '=' ? 2 : source[sourceLength - 1] === '=' ? 1 : 0;
  const baseLength = (sourceLength - paddingLength) & 0xfffffffc;

  let tmp;
  let i = 0;
  let byteIndex = 0;

  for (; i < baseLength; i += 4) {
    tmp =
      (lookup[source.charCodeAt(i)] << 18) |
      (lookup[source.charCodeAt(i + 1)] << 12) |
      (lookup[source.charCodeAt(i + 2)] << 6) |
      lookup[source.charCodeAt(i + 3)];

    target[byteIndex++] = (tmp >> 16) & 0xff;
    target[byteIndex++] = (tmp >> 8) & 0xff;
    target[byteIndex++] = tmp & 0xff;
  }

  if (paddingLength === 1) {
    tmp =
      (lookup[source.charCodeAt(i)] << 10) |
      (lookup[source.charCodeAt(i + 1)] << 4) |
      (lookup[source.charCodeAt(i + 2)] >> 2);

    target[byteIndex++] = (tmp >> 8) & 0xff;
    target[byteIndex++] = tmp & 0xff;
  }

  if (paddingLength === 2) {
    tmp = (lookup[source.charCodeAt(i)] << 2) | (lookup[source.charCodeAt(i + 1)] >> 4);

    target[byteIndex++] = tmp & 0xff;
  }
}

// This file is based on code from the react-native-get-random-values repository.
// Source: https://github.com/LinusU/react-native-get-random-values/blob/modern/index.js
// Modifications:
// - Instead of applying to all global references of crypto, provide a ponyfill export.
// - Instead of having a package dependency on fast-base64-decode, copy the code here. There are issues with injecting a vendor file in the rollup config.

const { NativeModules } = require('react-native');

class TypeMismatchError extends Error {}
class QuotaExceededError extends Error {}

let warned = false;
function insecureRandomValues(array) {
  if (!warned) {
    console.warn(
      'Using an insecure random number generator, this should only happen when running in a debugger without support for crypto.getRandomValues'
    );
    warned = true;
  }

  for (let i = 0, r; i < array.length; i++) {
    if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
    array[i] = (r >>> ((i & 0x03) << 3)) & 0xff;
  }

  return array;
}

/**
 * @param {number} byteLength
 * @returns {string}
 */
function getRandomBase64(byteLength) {
  if (NativeModules.RNGetRandomValues) {
    return NativeModules.RNGetRandomValues.getRandomBase64(byteLength);
  } else if (NativeModules.ExpoRandom) {
    // Expo SDK 41-44
    return NativeModules.ExpoRandom.getRandomBase64String(byteLength);
  } else if (global.ExpoModules) {
    // Expo SDK 45+
    return global.ExpoModules.ExpoRandom.getRandomBase64String(byteLength);
  } else {
    throw new Error('Native module not found');
  }
}

/**
 * @param {Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Uint8ClampedArray} array
 */
function getRandomValues(array) {
  if (
    !(
      array instanceof Int8Array ||
      array instanceof Uint8Array ||
      array instanceof Int16Array ||
      array instanceof Uint16Array ||
      array instanceof Int32Array ||
      array instanceof Uint32Array ||
      array instanceof Uint8ClampedArray
    )
  ) {
    throw new TypeMismatchError('Expected an integer array');
  }

  if (array.byteLength > 65536) {
    throw new QuotaExceededError('Can only request a maximum of 65536 bytes');
  }

  // Expo SDK 48+
  if (
    global.expo &&
    global.expo.modules &&
    global.expo.modules.ExpoCrypto &&
    global.expo.modules.ExpoCrypto.getRandomValues
  ) {
    // ExpoCrypto.getRandomValues doesn't return the array
    global.expo.modules.ExpoCrypto.getRandomValues(array);
    return array;
  }

  // Calling getRandomBase64 in remote debugging mode leads to the error
  // "Calling synchronous methods on native modules is not supported in Chrome".
  // So in that specific case we fall back to just using Math.random().
  if (isRemoteDebuggingInChrome()) {
    return insecureRandomValues(array);
  }

  base64Decode(getRandomBase64(array.byteLength), new Uint8Array(array.buffer, array.byteOffset, array.byteLength));

  return array;
}

function isRemoteDebuggingInChrome() {
  // Remote debugging in Chrome is not supported in bridgeless
  if ('RN$Bridgeless' in global && RN$Bridgeless === true) {
    return false;
  }

  return __DEV__ && typeof global.nativeCallSyncHook === 'undefined';
}

export default { getRandomValues };
