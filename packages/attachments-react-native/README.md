# @powersync/attachments-react-native

React Native file system storage adapters for [PowerSync](https://powersync.com) attachments.

This package provides `LocalStorageAdapter` implementations for React Native environments, allowing you to store and retrieve attachment files on device.

## Installation

```bash
npm install @powersync/attachments-react-native
# or
pnpm add @powersync/attachments-react-native
# or
yarn add @powersync/attachments-react-native
```

You'll also need to install one of the supported file system libraries:

### For Expo projects

```bash
npx expo install expo-file-system
```

### For bare React Native projects

```bash
npm install @dr.pogodin/react-native-fs
```

## Usage

### With Expo File System

```typescript
import { ExpoFileSystemStorageAdapter } from '@powersync/attachments-react-native';
import { AttachmentQueue } from '@powersync/react-native';

const storageAdapter = new ExpoFileSystemStorageAdapter();

const attachmentQueue = new AttachmentQueue({
  powersync: db,
  storage: cloudStorage,
  storageAdapter
});
```

### With React Native FS

```typescript
import { ReactNativeFileSystemStorageAdapter } from '@powersync/attachments-react-native';
import { AttachmentQueue } from '@powersync/react-native';

const storageAdapter = new ReactNativeFileSystemStorageAdapter();

const attachmentQueue = new AttachmentQueue({
  powersync: db,
  storage: cloudStorage,
  storageAdapter
});
```

### Custom Storage Directory

Both adapters accept an optional `storageDirectory` parameter:

```typescript
const storageAdapter = new ExpoFileSystemStorageAdapter('/custom/path/to/attachments/');
```

## API

Both adapters implement the `LocalStorageAdapter` interface from `@powersync/common`:

- `initialize()` - Create the storage directory if it doesn't exist
- `clear()` - Remove all files from the storage directory
- `getLocalUri(filename)` - Get the full path for a filename
- `saveFile(filePath, data, options?)` - Save data to a file
- `readFile(filePath, options?)` - Read a file as ArrayBuffer
- `deleteFile(filePath)` - Delete a file
- `fileExists(filePath)` - Check if a file exists
- `makeDir(path)` - Create a directory
- `rmDir(path)` - Remove a directory

## Supported Versions

| Adapter                               | Library                       | Supported Versions |
| ------------------------------------- | ----------------------------- | ------------------ |
| `ExpoFileSystemStorageAdapter`        | `expo-file-system`            | >=19.0.0           |
| `ReactNativeFileSystemStorageAdapter` | `@dr.pogodin/react-native-fs` | ^2.25.0            |

## License

Apache-2.0
