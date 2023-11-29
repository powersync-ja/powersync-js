---
id: "AttachmentQueueOptions"
title: "Interface: AttachmentQueueOptions"
sidebar_label: "AttachmentQueueOptions"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### attachmentDirectoryName

• `Optional` **attachmentDirectoryName**: `string`

The name of the directory where attachments are stored on the device, not the full path

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:19](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L19)

___

### cacheLimit

• `Optional` **cacheLimit**: `number`

How many attachments to keep in the cache

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:15](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L15)

___

### performInitialSync

• `Optional` **performInitialSync**: `boolean`

Whether to mark the initial watched attachment IDs to be synced

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:23](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L23)

___

### powersync

• **powersync**: `AbstractPowerSyncDatabase`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:6](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L6)

___

### storage

• **storage**: [`StorageAdapter`](StorageAdapter.md)

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:7](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L7)

___

### syncInterval

• `Optional` **syncInterval**: `number`

How often to check for new attachments to sync, in milliseconds. Set to 0 or undefined to disable.

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:11](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L11)
