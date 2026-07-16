# @powersync/attachments-storage-react-native

> [!NOTE]
> Attachment helpers are currently in an **alpha** state, intended strictly for testing. Expect breaking changes and instability as development continues.
>
> Do not rely on this package for production use.

React Native storage and transport adapters for [PowerSync](https://powersync.com) attachments.

This package provides:

- **Local storage adapters** (`LocalStorageAdapter`) — persist attachment files on device.
- **Streaming transport adapters** (`AttachmentTransportAdapter`) — move attachment bytes directly between the local file and remote storage using native APIs, without buffering the whole file in JS memory. Recommended for large files (recordings, videos) on lower-end devices.

## Installation

```bash
npm install @powersync/attachments-storage-react-native
# or
pnpm add @powersync/attachments-storage-react-native
# or
yarn add @powersync/attachments-storage-react-native
```

You'll also need to install one of the supported file system libraries. The same library powers both the local storage adapter and the native transport adapter for that platform.

### For Expo projects

> [!IMPORTANT]
> Requires Expo 54+

```bash
npx expo install expo-file-system
```

### For bare React Native projects

```bash
npm install @dr.pogodin/react-native-fs
```

## Local storage adapters

The local storage adapter handles file persistence on the device. Pass it to the queue as `localStorage`.

### With Expo File System

```typescript
import { ExpoFileSystemStorageAdapter } from '@powersync/attachments-storage-react-native';
import { AttachmentQueue } from '@powersync/react-native';

const localStorage = new ExpoFileSystemStorageAdapter();

const attachmentQueue = new AttachmentQueue({
  db,
  localStorage,
  remoteStorage, // your RemoteStorageAdapter (buffered upload/download/delete)
  watchAttachments
});
```

### With React Native FS

```typescript
import { ReactNativeFileSystemStorageAdapter } from '@powersync/attachments-storage-react-native';
import { AttachmentQueue } from '@powersync/react-native';

const localStorage = new ReactNativeFileSystemStorageAdapter();

const attachmentQueue = new AttachmentQueue({
  db,
  localStorage,
  remoteStorage,
  watchAttachments
});
```

### Custom storage directory

Both local adapters accept an optional `storageDirectory` parameter:

```typescript
const localStorage = new ExpoFileSystemStorageAdapter('/custom/path/to/attachments/');
```

## Streaming transport adapters

A transport adapter owns **all** remote operations (`upload` / `download` / `delete`) and transfers bytes natively — the file never enters the JS heap. When a `transportAdapter` is provided it fully replaces `remoteStorage` (which is no longer required); implement remote delete via the `deleteFile` callback.

Both transports are backend-agnostic: you supply resolver callbacks that map an attachment to a request (typically a presigned URL from your backend).

### With Expo File System (`uploadAsync` / `downloadAsync`)

```typescript
import {
  ExpoFileSystemStorageAdapter,
  ExpoFileSystemTransportAdapter
} from '@powersync/attachments-storage-react-native';
import { AttachmentQueue } from '@powersync/react-native';

const localStorage = new ExpoFileSystemStorageAdapter();

const transportAdapter = new ExpoFileSystemTransportAdapter({
  resolveUpload: async (attachment) => ({
    url: await getSignedUploadUrl(attachment.filename), // from your backend
    httpMethod: 'PUT',
    mimeType: attachment.mediaType ?? 'application/octet-stream'
  }),
  resolveDownload: async (attachment) => ({
    url: await getSignedDownloadUrl(attachment.filename)
  }),
  deleteFile: async (attachment) => {
    await deleteFromRemoteStorage(attachment.filename); // your SDK / DELETE call
  }
});

const attachmentQueue = new AttachmentQueue({
  db,
  localStorage,
  transportAdapter, // owns upload/download/delete — no remoteStorage needed
  watchAttachments
});
```

### With React Native FS (`uploadFiles` / `downloadFile`)

Identical options shape. The upload is sent as a raw binary `PUT` (`binaryStreamOnly`), suitable for presigned S3/Supabase URLs.

```typescript
import {
  ReactNativeFileSystemStorageAdapter,
  ReactNativeFSTransportAdapter
} from '@powersync/attachments-storage-react-native';

const localStorage = new ReactNativeFileSystemStorageAdapter();

const transportAdapter = new ReactNativeFSTransportAdapter({
  resolveUpload: async (attachment) => ({
    url: await getSignedUploadUrl(attachment.filename),
    httpMethod: 'PUT',
    mimeType: attachment.mediaType ?? 'application/octet-stream'
  }),
  resolveDownload: async (attachment) => ({
    url: await getSignedDownloadUrl(attachment.filename)
  }),
  deleteFile: async (attachment) => {
    await deleteFromRemoteStorage(attachment.filename);
  }
});
```

## Registering an on-disk file (buffer-free)

For files already written to disk (recordings, camera/picker output), use `AttachmentQueue.saveFileFromUri` to register them without reading the bytes into memory — the local adapter's `moveFile` relocates the file into managed storage.

```typescript
await attachmentQueue.saveFileFromUri({
  localUri, // path to the existing file
  fileExtension: 'm4a',
  mediaType: 'audio/m4a'
});
```

## API

### Local storage adapters

Implement the `LocalStorageAdapter` interface from `@powersync/common`:

- `initialize()` - Create the storage directory if it doesn't exist
- `clear()` - Remove all files from the storage directory
- `getLocalUri(filename)` - Get the full path for a filename
- `saveFile(filePath, data, options?)` - Save data to a file
- `readFile(filePath, options?)` - Read a file as ArrayBuffer
- `moveFile(sourceUri, targetUri)` - Move a file into managed storage without buffering (enables `saveFileFromUri`)
- `deleteFile(filePath)` - Delete a file
- `fileExists(filePath)` - Check if a file exists
- `makeDir(path)` - Create a directory
- `rmDir(path)` - Remove a directory

### Transport adapters

Implement the `AttachmentTransportAdapter` interface from `@powersync/common`:

- `upload(attachment)` - Transfer the local file to remote storage
- `download(attachment)` - Transfer the remote file into `attachment.localUri`
- `delete(attachment)` - Delete the file from remote storage

## Supported Versions

| Adapter                               | Library                       | Supported Versions  |
| ------------------------------------- | ----------------------------- | ------------------- |
| `ExpoFileSystemStorageAdapter`        | `expo-file-system`            | >=19.0.0 (Expo 54+) |
| `ExpoFileSystemTransportAdapter`      | `expo-file-system`            | >=19.0.0 (Expo 54+) |
| `ReactNativeFileSystemStorageAdapter` | `@dr.pogodin/react-native-fs` | ^2.25.0             |
| `ReactNativeFSTransportAdapter`       | `@dr.pogodin/react-native-fs` | ^2.25.0             |

## License

Apache-2.0
