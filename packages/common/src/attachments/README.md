# Attachments utilities and functions

PowerSync utilities and classes managing file attachments in JavaScript/TypeScript applications. Automatically handles synchronization of files between local storage and remote storage (S3, Supabase Storage, etc.), with support for upload/download queuing, offline functionality, and cache management.

For detailed concepts and guides, see the [PowerSync documentation](https://docs.powersync.com/usage/use-case-examples/attachments-files).

## Quick Start

This example shows a web application where users have profile photos stored as attachments.

### 1. Add AttachmentTable to your schema

```typescript
import { Schema, Table, column, AttachmentTable } from '@powersync/web';

const appSchema = new Schema({
  users: new Table({
    name: column.text,
    email: column.text,
    photo_id: column.text
  }),
  attachments: new AttachmentTable()
});
```

### 2. Set up storage adapters

```typescript
import { IndexDBFileSystemStorageAdapter } from '@powersync/web';

// Local storage for the browser (IndexedDB)
const localStorage = new IndexDBFileSystemStorageAdapter('my-app-files');

// Remote storage adapter for your cloud storage (e.g., S3, Supabase)
const remoteStorage = {
  async uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void> {
    // Get signed upload URL from your backend
    const { uploadUrl } = await fetch('/api/attachments/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: attachment.filename })
    }).then(r => r.json());
    
    // Upload file to cloud storage
    await fetch(uploadUrl, {
      method: 'PUT',
      body: fileData,
      headers: { 'Content-Type': attachment.mediaType || 'application/octet-stream' }
    });
  },
  
  async downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer> {
    // Get signed download URL from your backend
    const { downloadUrl } = await fetch(`/api/attachments/download-url/${attachment.id}`)
      .then(r => r.json());
    
    // Download file from cloud storage
    const response = await fetch(downloadUrl);
    return response.arrayBuffer();
  },
  
  async deleteFile(attachment: AttachmentRecord): Promise<void> {
    // Delete from cloud storage via your backend
    await fetch(`/api/attachments/${attachment.id}`, { method: 'DELETE' });
  }
};
```

> **Note:** For Node.js or Electron apps, use `NodeFileSystemAdapter` instead:
> ```typescript
> import { NodeFileSystemAdapter } from '@powersync/node';
> const localStorage = new NodeFileSystemAdapter('./user-attachments');
> ```

### 3. Create and start AttachmentQueue

```typescript
import { AttachmentQueue } from '@powersync/web';

const profilePicturesQueue = new AttachmentQueue({
  db: powersync,
  localStorage,
  remoteStorage,
  // Determine what attachments the queue should handle
  // in this case it handles only the user profile pictures
  watchAttachments: (onUpdate) => {
    powersync.watch(
      'SELECT photo_id FROM users WHERE photo_id IS NOT NULL',
      [],
      {
        onResult: (result) => {
          const attachments = result.rows?._array.map(row => ({
            id: row.photo_id,
            fileExtension: 'jpg'
          })) ?? [];
          onUpdate(attachments);
        }
      }
    );
  }
});

// Start automatic syncing
await profilePicturesQueue.startSync();
```

### 4. Save files with atomic updates

```typescript
// When user uploads a profile photo
async function uploadProfilePhoto(imageBlob: Blob) {
  const arrayBuffer = await imageBlob.arrayBuffer();
  
  const attachment = await queue.saveFile({
    data: arrayBuffer,
    fileExtension: 'jpg',
    mediaType: 'image/jpeg',
    // Atomically update the user record in the same transaction
    updateHook: async (tx, attachment) => {
      await tx.execute(
        'UPDATE users SET photo_id = ? WHERE id = ?',
        [attachment.id, currentUserId]
      );
    }
  });
  
  console.log('Photo queued for upload:', attachment.id);
  // File will automatically upload in the background
}
```

## Storage Adapters

### Local Storage Adapters

Local storage adapters handle file persistence on the device.

#### IndexDBFileSystemStorageAdapter

For web browsers using IndexedDB:

```typescript
import { IndexDBFileSystemStorageAdapter } from '@powersync/web';

const localStorage = new IndexDBFileSystemStorageAdapter('database-name');
```

**Constructor Parameters:**
- `databaseName` (string, optional): IndexedDB database name. Default: `'PowerSyncFiles'`

#### NodeFileSystemAdapter

For Node.js and Electron using Node filesystem:

```typescript
import { NodeFileSystemAdapter } from '@powersync/node';

const localStorage = new NodeFileSystemAdapter('./attachments');
```

### ExpoFileSystemAdapter

For React Native using Expo:

```typescript
import { ExpoFileSystemAdapter } from '@powersync/react-native'

const localeStorage = new ExpoFileSystemAdapter();
```

**Constructor Parameters:**
- `storageDirectory` (string, optional): Directory path for storing files. Default: `'./user_data'`

#### Custom Local Storage Adapter

Implement the `LocalStorageAdapter` interface for other environments:

```typescript
interface LocalStorageAdapter {
  initialize(): Promise<void>;
  clear(): Promise<void>;
  getLocalUri(filename: string): string;
  saveFile(filePath: string, data: ArrayBuffer | string): Promise<number>;
  readFile(filePath: string): Promise<ArrayBuffer>;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  makeDir(path: string): Promise<void>;
  rmDir(path: string): Promise<void>;
}
```

### Remote Storage Adapter

Remote storage adapters handle communication with your cloud storage (S3, Supabase Storage, Cloudflare R2, etc.).

#### Interface

```typescript
interface RemoteStorageAdapter {
  uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void>;
  downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer>;
  deleteFile(attachment: AttachmentRecord): Promise<void>;
}
```

#### Example: S3-Compatible Storage with Signed URLs

```typescript
import { RemoteStorageAdapter, AttachmentRecord } from '@powersync/web';

const remoteStorage: RemoteStorageAdapter = {
  async uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void> {
    // Request signed upload URL from your backend
    const response = await fetch('https://api.example.com/attachments/upload-url', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ 
        filename: attachment.filename,
        contentType: attachment.mediaType 
      })
    });
    
    const { uploadUrl } = await response.json();
    
    // Upload directly to S3 using signed URL
    await fetch(uploadUrl, {
      method: 'PUT',
      body: fileData,
      headers: { 'Content-Type': attachment.mediaType || 'application/octet-stream' }
    });
  },

  async downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer> {
    // Request signed download URL from your backend
    const response = await fetch(
      `https://api.example.com/attachments/${attachment.id}/download-url`,
      { headers: { 'Authorization': `Bearer ${getAuthToken()}` } }
    );
    
    const { downloadUrl } = await response.json();
    
    // Download from S3 using signed URL
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Download failed: ${fileResponse.statusText}`);
    }
    
    return fileResponse.arrayBuffer();
  },

  async deleteFile(attachment: AttachmentRecord): Promise<void> {
    // Delete via your backend (backend handles S3 deletion)
    await fetch(`https://api.example.com/attachments/${attachment.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
  }
};
```

> **Security Note:** Always use your backend to generate signed URLs and validate permissions. Never expose storage credentials to the client.

## API Reference

### AttachmentQueue

Main class for managing attachment synchronization.

#### Constructor

```typescript
new AttachmentQueue(options: AttachmentQueueOptions)
```

**Options:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `db` | `AbstractPowerSyncDatabase` | Yes | - | PowerSync database instance |
| `remoteStorage` | `RemoteStorageAdapter` | Yes | - | Remote storage adapter implementation |
| `localStorage` | `LocalStorageAdapter` | Yes | - | Local storage adapter implementation |
| `watchAttachments` | `(onUpdate: (attachments: WatchedAttachmentItem[]) => Promise<void>) => void` | Yes | - | Callback to determine which attachments to handle by the queue from your user defined query |
| `tableName` | `string` | No | `'attachments'` | Name of the attachments table |
| `logger` | `ILogger` | No | `db.logger` | Logger instance for diagnostic output |
| `syncIntervalMs` | `number` | No | `30000` | Interval between automatic syncs in milliseconds |
| `syncThrottleDuration` | `number` | No | `30` | Throttle duration for sync operations in milliseconds |
| `downloadAttachments` | `boolean` | No | `true` | Whether to automatically download remote attachments |
| `archivedCacheLimit` | `number` | No | `100` | Maximum number of archived attachments before cleanup |
| `errorHandler` | `AttachmentErrorHandler` | No | `undefined` | Custom error handler for upload/download/delete operations |

#### Methods

##### `startSync()`

Starts automatic attachment synchronization.

```typescript
await queue.startSync();
```

This will:
- Initialize local storage
- Set up periodic sync based on `syncIntervalMs`
- Watch for changes in active attachments
- Process queued uploads, downloads, and deletes

##### `stopSync()`

Stops automatic attachment synchronization.

```typescript
await queue.stopSync();
```

##### `saveFile(options)`

Saves a file locally and queues it for upload to remote storage.

```typescript
const attachment = await queue.saveFile({
  data: arrayBuffer,
  fileExtension: 'pdf',
  mediaType: 'application/pdf',
  id: 'custom-id', // optional
  metaData: '{"description": "Invoice"}', // optional
  updateHook: async (tx, attachment) => {
    // Update your data model in the same transaction
    await tx.execute(
      'INSERT INTO documents (id, attachment_id) VALUES (?, ?)',
      [documentId, attachment.id]
    );
  }
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data` | `ArrayBuffer \| string` | Yes | File data as ArrayBuffer or base64 string |
| `fileExtension` | `string` | Yes | File extension (e.g., 'jpg', 'pdf') |
| `mediaType` | `string` | No | MIME type (e.g., 'image/jpeg') |
| `id` | `string` | No | Custom attachment ID (UUID generated if not provided) |
| `metaData` | `string` | No | Optional metadata JSON string |
| `updateHook` | `(tx: Transaction, attachment: AttachmentRecord) => Promise<void>` | No | Callback to update your data model atomically |

**Returns:** `Promise<AttachmentRecord>` - The created attachment record

The `updateHook` is executed in the same database transaction as the attachment creation, ensuring atomic operations. This is the recommended way to link attachments to your data model.

##### `deleteFile(options)`

Deletes an attachment from both local and remote storage.

```typescript
await queue.deleteFile({
  id: attachmentId,
  updateHook: async (tx, attachment) => {
    // Update your data model in the same transaction
    await tx.execute(
      'UPDATE users SET photo_id = NULL WHERE photo_id = ?',
      [attachment.id]
    );
  }
});
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Attachment ID to delete |
| `updateHook` | `(tx: Transaction, attachment: AttachmentRecord) => Promise<void>` | No | Callback to update your data model atomically |

##### `generateAttachmentId()`

Generates a new UUID for an attachment using SQLite's `uuid()` function.

```typescript
const id = await queue.generateAttachmentId();
```

**Returns:** `Promise<string>` - A new UUID

##### `syncStorage()`

Manually triggers a sync operation. This is called automatically at regular intervals, but can be invoked manually if needed.

```typescript
await queue.syncStorage();
```

##### `verifyAttachments()`

Verifies the integrity of all attachment records and repairs inconsistencies. Checks each attachment against local storage and:
- Updates `localUri` if file exists at a different path
- Archives attachments with missing local files that haven't been uploaded
- Requeues synced attachments for download if local files are missing

```typescript
await queue.verifyAttachments();
```

This is automatically called when `startSync()` is invoked.

##### `watchAttachments` callback

The `watchAttachments` callback is a required parameter that tells the AttachmentQueue which attachments to handle. This tells the queue which attachments to download, upload, or archive.

**Signature:**

```typescript
(onUpdate: (attachments: WatchedAttachmentItem[]) => Promise<void>) => void
```

**WatchedAttachmentItem:**

```typescript
type WatchedAttachmentItem = {
  id: string;
  fileExtension: string;  // e.g., 'jpg', 'pdf'
  metaData?: string;
} | {
  id: string;
  filename: string;       // e.g., 'document.pdf'
  metaData?: string;
};
```

Use either `fileExtension` OR `filename`, not both.

**Example:**

```typescript
watchAttachments: (onUpdate) => {
  // Watch for photo references in users table
  db.watch(
    'SELECT photo_id, metadata FROM users WHERE photo_id IS NOT NULL',
    [],
    {
      onResult: async (result) => {
        const attachments = result.rows?._array.map(row => ({
          id: row.photo_id,
          fileExtension: 'jpg',
          metaData: row.metadata
        })) ?? [];
        await onUpdate(attachments);
      }
    }
  );
}
```

---

### AttachmentTable

PowerSync schema table for storing attachment metadata.

#### Constructor

```typescript
new AttachmentTable(options?: AttachmentTableOptions)
```

**Options:**

Extends PowerSync `TableV2Options` (excluding `name` and `columns`).

| Parameter | Type | Description |
|-----------|------|-------------|
| `viewName` | `string` | View name for the table. Default: `'attachments'` |
| `localOnly` | `boolean` | Whether table is local-only. Default: `true` |
| `insertOnly` | `boolean` | Whether table is insert-only. Default: `false` |

#### Default Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT` | Attachment ID (primary key) |
| `filename` | `TEXT` | Filename with extension |
| `local_uri` | `TEXT` | Local file path or URI |
| `timestamp` | `INTEGER` | Last update timestamp |
| `size` | `INTEGER` | File size in bytes |
| `media_type` | `TEXT` | MIME type |
| `state` | `INTEGER` | Sync state (see `AttachmentState`) |
| `has_synced` | `INTEGER` | Whether file has synced (0 or 1) |
| `meta_data` | `TEXT` | Optional metadata JSON string |

---

### AttachmentRecord

Interface representing an attachment record.

```typescript
interface AttachmentRecord {
  id: string;
  filename: string;
  localUri?: string;
  size?: number;
  mediaType?: string;
  timestamp?: number;
  metaData?: string;
  hasSynced?: boolean;
  state: AttachmentState;
}
```

---

### AttachmentState

Enum representing attachment synchronization states.

```typescript
enum AttachmentState {
  QUEUED_SYNC = 0,      // Check if upload or download needed
  QUEUED_UPLOAD = 1,    // Queued for upload
  QUEUED_DOWNLOAD = 2,  // Queued for download
  QUEUED_DELETE = 3,    // Queued for deletion
  SYNCED = 4,           // Successfully synced
  ARCHIVED = 5          // No longer referenced (orphaned)
}
```

---

### LocalStorageAdapter

Interface for local file storage operations.

```typescript
interface LocalStorageAdapter {
  initialize(): Promise<void>;
  clear(): Promise<void>;
  getLocalUri(filename: string): string;
  saveFile(filePath: string, data: ArrayBuffer | string): Promise<number>;
  readFile(filePath: string): Promise<ArrayBuffer>;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  makeDir(path: string): Promise<void>;
  rmDir(path: string): Promise<void>;
}
```

---

### RemoteStorageAdapter

Interface for remote storage operations.

```typescript
interface RemoteStorageAdapter {
  uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void>;
  downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer>;
  deleteFile(attachment: AttachmentRecord): Promise<void>;
}
```

---

### NodeFileSystemAdapter

Local storage adapter for Node.js and Electron.

**Constructor:**

```typescript
new NodeFileSystemAdapter(storageDirectory?: string)
```

- `storageDirectory` (optional): Directory path for storing files. Default: `'./user_data'`

---

### IndexDBFileSystemStorageAdapter

Local storage adapter for web browsers using IndexedDB.

**Constructor:**

```typescript
new IndexDBFileSystemStorageAdapter(databaseName?: string)
```

- `databaseName` (optional): IndexedDB database name. Default: `'PowerSyncFiles'`

## Error Handling

The `AttachmentErrorHandler` interface allows you to customize error handling for sync operations.

### Interface

```typescript
interface AttachmentErrorHandler {
  onDownloadError(attachment: AttachmentRecord, error: Error): Promise<boolean>;
  onUploadError(attachment: AttachmentRecord, error: Error): Promise<boolean>;
  onDeleteError(attachment: AttachmentRecord, error: Error): Promise<boolean>;
}
```

Each method returns:
- `true` to retry the operation
- `false` to archive the attachment and skip retrying

### Example

```typescript
const errorHandler: AttachmentErrorHandler = {
  async onDownloadError(attachment, error) {
    console.error(`Download failed for ${attachment.filename}:`, error);
    
    // Retry on network errors, archive on 404s
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      console.log('File not found, archiving attachment');
      return false; // Archive
    }
    
    console.log('Will retry download on next sync');
    return true; // Retry
  },

  async onUploadError(attachment, error) {
    console.error(`Upload failed for ${attachment.filename}:`, error);
    
    // Always retry uploads
    return true;
  },

  async onDeleteError(attachment, error) {
    console.error(`Delete failed for ${attachment.filename}:`, error);
    
    // Retry deletes, but archive after too many attempts
    const attempts = attachment.metaData ? 
      JSON.parse(attachment.metaData).deleteAttempts || 0 : 0;
    
    return attempts < 3; // Retry up to 3 times
  }
};

const queue = new AttachmentQueue({
  // ... other options
  errorHandler
});
```

## Advanced Usage

### Verification and Recovery

The `verifyAttachments()` method checks attachment integrity and repairs issues:

```typescript
// Manually verify all attachments
await queue.verifyAttachments();
```

This is useful if:
- Local files may have been manually deleted
- Storage paths changed
- You suspect data inconsistencies

Verification is automatically run when `startSync()` is called.

### Custom Sync Intervals

Adjust sync frequency based on your needs:

```typescript
const queue = new AttachmentQueue({
  // ... other options
  syncIntervalMs: 60000, // Sync every 60 seconds instead of 30
});
```

Set to `0` to disable periodic syncing (manual `syncStorage()` calls only).

### Archive and Cache Management

Control how many archived attachments are kept before cleanup:

```typescript
const queue = new AttachmentQueue({
  // ... other options
  archivedCacheLimit: 200, // Keep up to 200 archived attachments
});
```

Archived attachments are those no longer referenced in your data model but not yet deleted. This allows for:
- Quick restoration if references are added back
- Caching of recently used files
- Gradual cleanup to avoid storage bloat

When the limit is reached, the oldest archived attachments are permanently deleted.

## Examples

See the following demo applications in this repository:

- **[react-supabase-todolist](../../../../demos/react-supabase-todolist)** - React web app with Supabase Storage integration
- **[react-native-supabase-todolist](../../../../demos/react-native-supabase-todolist)** - React Native mobile app with attachment support

Each demo shows a complete implementation including:
- Schema setup
- Storage adapter configuration
- File upload/download UI
- Error handling

## License

Apache 2.0
