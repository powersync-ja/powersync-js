/**
 * Some JavaScript engines, in particular older versions of React Native, don't support Symbol.asyncIterator.
 *
 * For those, users relying on async generators typically lower them with a transpiler and [this polyfill](https://github.com/Azure/azure-sdk-for-js/blob/%40azure/core-asynciterator-polyfill_1.0.2/sdk/core/core-asynciterator-polyfill/src/index.ts#L4-L6).
 * This definition is compatible with that polyfill, so transpiled apps can use async iterables created by the PowerSync
 * SDK.
 */
export const symbolAsyncIterator: typeof Symbol.asyncIterator =
  Symbol.asyncIterator ?? Symbol.for('Symbol.asyncIterator');
