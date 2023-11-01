# @journeyapps/powersync-attachments

A [PowerSync](https://powersync.co) library to manage attachments in TypeScript and React Native apps.

Note: This package is currently in a beta release.

# Usage

## Installation

**yarn**
```bash
yarn add @journeyapps/powersync-attachments
```

**pnpm**
```bash
pnpm install @journeyapps/powersync-attachments
```

## API

### Implement an `AttachmentQueue`

The `AttachmentQueue` class is used to manage and sync attachments in your app.

In this example we are capturing photos as part of an inspection workflow. Here is the schema for the `checklist` table:

```typescript
const AppSchema = new Schema([
  new Table({
    name: 'checklists',
    columns: [
      new Column({ name: 'photo_id', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT }),
      new Column({ name: 'completed', type: ColumnType.INTEGER }),
      new Column({ name: 'completed_at', type: ColumnType.TEXT }),
      new Column({ name: 'completed_by', type: ColumnType.TEXT })
    ],
    indexes: [
      new Index({
        name: 'inspections',
        columns: [new IndexedColumn({ name: 'checklist_id' })]
      })
    ]
  })
]);
```

1. Implement a new class `AttachmentQueue` that extends `AbstractAttachmentQueue` from `@journeyapps/powersync-attachments`.
2. Implement the `attachmentIds` AsyncIterator method to return an array of `string` values of IDs that relate to attachments in your app. 
 
We use `PowerSync`'s watch query to return the all IDs of photos that have been captured as part of an inspection, and map them to an array of `string` values.

```typescript
import { AbstractAttachmentQueue } from '@journeyapps/powersync-attachments';

export class AttachmentQueue extends AbstractAttachmentQueue {
  async *attachmentIds(): AsyncIterable<string[]> {
    for await (const result of this.powersync.watch(
      `SELECT photo_id as id FROM checklists WHERE photo_id IS NOT NULL`,
      []
    )) {
      yield result.rows?._array.map((r) => r.id) ?? [];
    }
  }
}
```

3. Implement `newAttachmentRecord` to return an object that represents the attachment record in your app. In this example we always work with JPEG images, but you can use any media type that is supported by your app and storage solution.

```typescript
import { AbstractAttachmentQueue } from '@journeyapps/powersync-attachments';

export class AttachmentQueue extends AbstractAttachmentQueue {
  // ...
  
   async newAttachmentRecord(record?: Partial<AttachmentRecord>): Promise<AttachmentRecord> {
      const photoId = record?.id ?? uuid();
      const filename = record?.filename ?? `${photoId}.jpg`;
      return {
         id: photoId,
         filename,
         media_type: 'image/jpeg',
         state: AttachmentState.QUEUED_UPLOAD,
         ...record
      };
   }
}
```

4. Add an `AttachmentTable` to your app's PowerSync Schema:

```typescript
import { AttachmentTable } from '@journeyapps/powersync-attachments';

const AppSchema = new Schema([
   // ... other tables
   new AttachmentTable()
]);
```

The `AttachmentTable` can optionally be configured with the following options, in addition to `Table` options: 

| Option              | Description                                                                          | Default                       |
|---------------------|--------------------------------------------------------------------------------------|-------------------------------|
| `name`              | The name of the table                                                                | `attachments`                 |
| `additionalColumns` | An array of addition `Column` objects that added to the default columns in the table | See below for default columns |

The default columns in the `AttachmentTable` are:

| Column Name  | Type      | Description                                                       |
|--------------|-----------|-------------------------------------------------------------------|
| `id`         | `TEXT`    | The ID of the attachment record                                   |
| `filename`   | `TEXT`    | The filename of the attachment                                    |
| `media_type` | `TEXT`    | The media type of the attachment                                  |
| `state`      | `INTEGER` | The state of the attachment, one of `AttachmentState` enum values |
| `timestamp`  | `INTEGER` | The timestamp of last update to the attachment record             |
| `size`       | `INTEGER` | The size of the attachment in bytes                               |

5. To instantiate an `AttachmentQueue`, one needs to provide an instance of `AbstractPowerSyncDatabase` from PowerSync and an instance of `StorageAdapter`. For the specifications about what must be implemented in `StorageAdapter`, please refer to its interface definition.

6. Instantiate you `AttachmentQueue` and call `init()` to start syncing attachments. (Example below uses Supabase Storage)

```typescript
this.storage = this.supabaseConnector.storage;
this.powersync = factory.getInstance();

this.attachmentQueue = new AttachmentQueue({
   powersync: this.powersync,
   storage: this.storage
});

await this.attachmentQueue.init();
```

# Implementation details

## Attachment States

The `AttachmentQueue` class manages attachments in your app by tracking their state. The state of an attachment can be one of the following:

| State             | Description                                                                   |
|-------------------|-------------------------------------------------------------------------------|
| `QUEUED_SYNC`     | Check if the attachment needs to be uploaded or downloaded                    |
| `QUEUED_UPLOAD`   | The attachment has been queued for upload to the cloud storage                |
| `QUEUED_DOWNLOAD` | The attachment has been queued for download from the cloud storage            |
| `SYNCED`          | The attachment has been synced                                                |
| `ARCHIVED`        | The attachment has been orphaned, i.e. the associated record has been deleted |

## Initial sync

Upon initializing the `AttachmentQueue`, an initial sync of attachments will take place if the `performInitialSync` is set to true. 
Any attachment record with `id` in first set of IDs retrieved from the watch query will be marked as `QUEUED_SYNC`, and these records will be rechecked to see if they need to be uploaded or downloaded.

## Syncing attachments

The `AttachmentQueue` sets up two watch queries on the `attachments` table, one for records in `QUEUED_UPLOAD` state and one for `QUEUED_DOWNLOAD` state. 

In addition to watching for changes, the `AttachmentQueue` also trigger a sync every few seconds. This will retry any failed uploads/downloads, in particular after the app was offline
By default, this is every 30 seconds, but can be configured by setting `syncInterval` in the `AttachmentQueue` constructor options, or disabled by setting the interval to `0`.

### Uploading

- An `AttachmentRecord` is created or updated with a state of `QUEUED_UPLOAD`.
- The `AttachmentQueue` picks this up and upon successful upload to Supabase, sets the state to `SYNCED`.
- If the upload is not successful, the record remains in `QUEUED_UPLOAD` state and uploading will be retried when syncing triggers again.

### Downloading

- An `AttachmentRecord` is created or updated with QUEUED_DOWNLOAD state.
- The watch query adds the `id` into a queue of IDs to download and triggers the download process
- This checks whether the photo is already on the device and if so, skips downloading.
- If the photo is not on the device, it is downloaded from cloud storage.
- Writes file to the user's local storage.
- If this is successful, update the AttachmentRecord state to `SYNCED`.
- If any of these fail, the download is retried in the next sync trigger.

### Expire Cache

When PowerSync removes a records (as a result of coming back online or conflict resolution):
- Any associated `AttachmentRecord` is orphaned.
- On the next sync trigger, the `AttachmentQueue` sets all records that are orphaned to `ARCHIVED` state.
- By default, the `AttachmentQueue` only keeps the last `100` attachment records and then expires the rest. (This can be configured by setting `cacheLimit` in the `AttachmentQueue` constructor options).

### Deleting attachments

When a list or to-do item is deleted by a user action or cache expiration:
- Related `AttachmentRecord` is removed from attachments table.
- Local file (if exists) is deleted.
- File on cloud storage is deleted.