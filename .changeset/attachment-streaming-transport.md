---
'@powersync/common': minor
'@powersync/attachments-storage-react-native': minor
'@powersync/node': minor
---

Add a streaming attachment transport (`AttachmentTransportAdapter` with a default `BufferedAttachmentTransport`, plus native `ExpoFileSystemTransportAdapter` and `ReactNativeFSTransportAdapter` implementations) and `AttachmentQueue.saveFileFromUri`, so large files can be uploaded and downloaded without being buffered in JS memory.
