---
'@powersync/common': minor
'@powersync/attachments-storage-react-native': minor
'@powersync/node': minor
---

Add a streaming attachment transport (`AttachmentTransportAdapter`) and `AttachmentQueue.saveFileFromUri`, with native `createTransportAdapter` implementations for Node, Expo (SDK 56+), and React Native, so large files transfer without being buffered in JS memory.
