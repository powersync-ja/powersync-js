---
'@powersync/react-native': major
---

This release removes polyfills previously embedded into the React Native SDK to support
older React Native versions.

In particular, the following polyfills have been removed:

- `TextEncoder` and `TextDecoder`: Support for `TextDecoder` has recently been added to React Native,
  and the SDK only uses it with very old PowerSync service versions as binary streams are preferred.
- `react-native-fetch-api`: The package was effectively unmaintained. We now use `expo/fetch` as a default
  HTTP client. When unavailable, we fall back to the builtin `fetch` polyfill in React Native.
  Note that this doesn't support streams, so we recommend enabling `{ connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET }` for non-Expo apps with PowerSync.
- `ReadableStream`: We expect that `fetch` implementations correctly implement `Response.getReader()`.
