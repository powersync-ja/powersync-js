# @powersync/attachments

A [PowerSync](https://powersync.com) library to manage attachments in React Native and JavaScript/TypeScript apps.

## Installation

**yarn**

```bash
yarn add @powersync/attachments
```

**pnpm**

```bash
pnpm add @powersync/attachments
```

**npm**

```bash
npm install @powersync/attachments
```

## Usage

The `AttachmentQueue` class is used to manage and sync attachments in your app.

### Example

In this example, the user captures photos when checklist items are completed as part of an inspection workflow.

The schema for the `checklist` table:

```javascript
const checklists = new Table(
  {
    photo_id: column.text,
    description: column.text,
    completed: column.integer,
    completed_at: column.text,
    completed_by: column.text
  },
  { indexes: { inspections: ['checklist_id'] } }
);

const AppSchema = new Schema({
  checklists
});
```

### Steps to implement

1. Create a new class `AttachmentQueue` that extends `AbstractAttachmentQueue` from `@powersync/attachments`.

```javascript
import { AbstractAttachmentQueue } from '@powersync/attachments';

export class AttachmentQueue extends AbstractAttachmentQueue {}
```

2. Implement `onAttachmentIdsChange`, which takes in a callback to handle an array of `string` values of IDs that relate to attachments in your app. We recommend using `PowerSync`'s `watch` query to return the all IDs of attachments in your app.

   In this example, we query all photos that have been captured as part of an inspection and map these to an array of `string` values.

```javascript
import { AbstractAttachmentQueue } from '@powersync/attachments';

export class AttachmentQueue extends AbstractAttachmentQueue {
  onAttachmentIdsChange(onUpdate) {
    this.powersync.watch('SELECT photo_id as id FROM checklists WHERE photo_id IS NOT NULL', [], {
      onResult: (result) => onUpdate(result.rows?._array.map((r) => r.id) ?? [])
    });
  }
}
```

3. Implement `newAttachmentRecord` to return an object that represents the attachment record in your app.

   In this example we always work with `JPEG` images, but you can use any media type that is supported by your app and storage solution. Note: we are set the state to `QUEUED_UPLOAD` when creating a new photo record which assumes that the photo data is already on the device.

```javascript
import { AbstractAttachmentQueue } from '@powersync/attachments';

export class AttachmentQueue extends AbstractAttachmentQueue {
  // ...
  async newAttachmentRecord(record) {
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

```javascript
import { AttachmentTable } from '@powersync/attachments';

const AppSchema = new Schema({
  // ... other tables
  attachments: new AttachmentTable({
    name: 'attachments',
  }),
});
```

In addition to `Table` options, the `AttachmentTable` can optionally be configured with the following options:

| Option              | Description                                                                     | Default                       |
| ------------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| `name`              | The name of the table                                                           | `attachments`                 |
| `additionalColumns` | An array of addition `Column` objects added to the default columns in the table | See below for default columns |

The default columns in `AttachmentTable`:

| Column Name  | Type      | Description                                                       |
| ------------ | --------- | ----------------------------------------------------------------- |
| `id`         | `TEXT`    | The ID of the attachment record                                   |
| `filename`    | `TEXT`    | The filename of the attachment                                     |
| `media_type` | `TEXT`    | The media type of the attachment                                  |
| `state`      | `INTEGER` | The state of the attachment, one of `AttachmentState` enum values |
| `timestamp`  | `INTEGER` | The timestamp of last update to the attachment record             |
| `size`       | `INTEGER` | The size of the attachment in bytes                               |

5. To instantiate an `AttachmentQueue`, one needs to provide an instance of `AbstractPowerSyncDatabase` from PowerSync and an instance of `StorageAdapter`.
   See the `StorageAdapter` interface definition [here](https://github.com/powersync-ja/powersync-js/blob/main/packages/attachments/src/StorageAdapter.ts).

6. Instantiate a new `AttachmentQueue` and call `init()` to start syncing attachments. Our example, uses a `StorageAdapter` that integrates with Supabase Storage.

```javascript
this.storage = this.supabaseConnector.storage;
this.powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'sqlite.db'
  }
});

this.attachmentQueue = new AttachmentQueue({
  powersync: this.powersync,
  storage: this.storage
});

// Initialize and connect PowerSync ...
// Then initialize the attachment queue
await this.attachmentQueue.init();
```

7. Finally, to create an attachment and add it to the queue, call `saveToQueue()`.

   In our example we added a `savePhoto()` method to our `AttachmentQueue` class, that does this:

```javascript
export class AttachmentQueue extends AbstractAttachmentQueue {
  // ...
  async savePhoto(base64Data) {
    const photoAttachment = await this.newAttachmentRecord();
    photoAttachment.local_uri = this.getLocalFilePathSuffix(photoAttachment.filename);

    const localFilePathUri = this.getLocalUri(photoAttachment.local_uri);

    await this.storage.writeFile(localFilePathUri, base64Data, { encoding: 'base64' });

    return this.saveToQueue(photoAttachment);
  }
}
```

# Implementation details

## Attachment State

The `AttachmentQueue` class manages attachments in your app by tracking their state.

The state of an attachment can be one of the following:

| State             | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| `QUEUED_SYNC`     | Check if the attachment needs to be uploaded or downloaded                    |
| `QUEUED_UPLOAD`   | The attachment has been queued for upload to the cloud storage                |
| `QUEUED_DOWNLOAD` | The attachment has been queued for download from the cloud storage            |
| `SYNCED`          | The attachment has been synced                                                |
| `ARCHIVED`        | The attachment has been orphaned, i.e. the associated record has been deleted |

## Initial sync

Upon initializing the `AttachmentQueue`, an initial sync of attachments will take place if the `performInitialSync` is set to true.
Any `AttachmentRecord` with `id` in first set of IDs retrieved from the watch query will be marked as `QUEUED_SYNC`, and these records will be rechecked to see if they need to be uploaded or downloaded.

## Syncing attachments

The `AttachmentQueue` sets up two watch queries on the `attachments` table, one for records in `QUEUED_UPLOAD` state and one for `QUEUED_DOWNLOAD` state.

In addition to watching for changes, the `AttachmentQueue` also triggers a sync every few seconds. This will retry any failed uploads/downloads, in particular after the app was offline.

By default, this is every 30 seconds, but can be configured by setting `syncInterval` in the `AttachmentQueue` constructor options, or disabled by setting the interval to `0`.

### Uploading

- An `AttachmentRecord` is created or updated with a state of `QUEUED_UPLOAD`.
- The `AttachmentQueue` picks this up and upon successful upload to Supabase, sets the state to `SYNCED`.
- If the upload is not successful, the record remains in `QUEUED_UPLOAD` state and uploading will be retried when syncing triggers again.

### Downloading

- An `AttachmentRecord` is created or updated with `QUEUED_DOWNLOAD` state.
- The watch query adds the `id` into a queue of IDs to download and triggers the download process
- This checks whether the photo is already on the device and if so, skips downloading.
- If the photo is not on the device, it is downloaded from cloud storage.
- Writes file to the user's local storage.
- If this is successful, update the `AttachmentRecord` state to `SYNCED`.
- If any of these fail, the download is retried in the next sync trigger.

### Deleting attachments

When an attachment is deleted by a user action or cache expiration:

- Related `AttachmentRecord` is removed from attachments table.
- Local file (if exists) is deleted.
- File on cloud storage is deleted.

### Expire Cache

When PowerSync removes a record, as a result of coming back online or conflict resolution for instance:

- Any associated `AttachmentRecord` is orphaned.
- On the next sync trigger, the `AttachmentQueue` sets all records that are orphaned to `ARCHIVED` state.
- By default, the `AttachmentQueue` only keeps the last `100` attachment records and then expires the rest.
- This can be configured by setting `cacheLimit` in the `AttachmentQueue` constructor options.
