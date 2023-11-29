---
id: "AbstractAttachmentQueue"
title: "Class: AbstractAttachmentQueue<T>"
sidebar_label: "AbstractAttachmentQueue"
sidebar_position: 0
custom_edit_url: null
---

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`AttachmentQueueOptions`](../interfaces/AttachmentQueueOptions.md) = [`AttachmentQueueOptions`](../interfaces/AttachmentQueueOptions.md) |

## Constructors

### constructor

• **new AbstractAttachmentQueue**<`T`\>(`options`): [`AbstractAttachmentQueue`](AbstractAttachmentQueue.md)<`T`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`AttachmentQueueOptions`](../interfaces/AttachmentQueueOptions.md) = [`AttachmentQueueOptions`](../interfaces/AttachmentQueueOptions.md) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `T` |

#### Returns

[`AbstractAttachmentQueue`](AbstractAttachmentQueue.md)<`T`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:40](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L40)

## Properties

### downloadQueue

• **downloadQueue**: `Set`<`string`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:38](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L38)

___

### downloading

• **downloading**: `boolean`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:35](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L35)

___

### initialSync

• **initialSync**: `boolean`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:36](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L36)

___

### options

• **options**: `T`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:37](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L37)

___

### uploading

• **uploading**: `boolean`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:34](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L34)

## Accessors

### powersync

• `get` **powersync**(): `AbstractPowerSyncDatabase`

#### Returns

`AbstractPowerSyncDatabase`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:67](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L67)

___

### storage

• `get` **storage**(): [`StorageAdapter`](../interfaces/StorageAdapter.md)

#### Returns

[`StorageAdapter`](../interfaces/StorageAdapter.md)

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:71](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L71)

___

### storageDirectory

• `get` **storageDirectory**(): `string`

#### Returns

`string`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:79](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L79)

___

### table

• `get` **table**(): `string`

#### Returns

`string`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:75](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L75)

## Methods

### attachmentIds

▸ **attachmentIds**(): `AsyncIterable`<`string`[]\>

Returns an async iterator that yields attachment IDs that need to be synced.
In most cases this will be a watch query

Example:
for await (const result of powersync.watch('SELECT photo_id as id FROM todos WHERE photo_id IS NOT NULL', [])) {
   yield result.rows?._array.map((r) => r.id) ?? [];
}

#### Returns

`AsyncIterable`<`string`[]\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:60](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L60)

___

### clearQueue

▸ **clearQueue**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:463](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L463)

___

### delete

▸ **delete**(`record`, `tx?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | [`AttachmentRecord`](../interfaces/AttachmentRecord.md) |
| `tx?` | `Transaction` |

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:198](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L198)

___

### downloadRecord

▸ **downloadRecord**(`record`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | [`AttachmentRecord`](../interfaces/AttachmentRecord.md) |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:277](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L277)

___

### downloadRecords

▸ **downloadRecords**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:410](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L410)

___

### expireCache

▸ **expireCache**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:443](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L443)

___

### getIdsToDownload

▸ **getIdsToDownload**(): `Promise`<`string`[]\>

#### Returns

`Promise`<`string`[]\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:375](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L375)

___

### getLocalUri

▸ **getLocalUri**(`filename`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `filename` | `string` |

#### Returns

`string`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:439](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L439)

___

### getNextUploadRecord

▸ **getNextUploadRecord**(): `Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

#### Returns

`Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:226](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L226)

___

### idsToDownload

▸ **idsToDownload**(): `AsyncIterable`<`string`[]\>

#### Returns

`AsyncIterable`<`string`[]\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:388](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L388)

___

### idsToUpload

▸ **idsToUpload**(): `AsyncIterable`<`string`[]\>

#### Returns

`AsyncIterable`<`string`[]\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:321](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L321)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:83](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L83)

___

### newAttachmentRecord

▸ **newAttachmentRecord**(`record?`): `Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

Create a new AttachmentRecord, this gets called when the attachment id is not found in the database.

#### Parameters

| Name | Type |
| :------ | :------ |
| `record?` | `Partial`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\> |

#### Returns

`Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:65](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L65)

___

### record

▸ **record**(`id`): `Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |

#### Returns

`Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:178](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L178)

___

### saveToQueue

▸ **saveToQueue**(`record`): `Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | `Omit`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md), ``"timestamp"``\> |

#### Returns

`Promise`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md)\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:156](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L156)

___

### trigger

▸ **trigger**(): `void`

#### Returns

`void`

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:98](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L98)

___

### update

▸ **update**(`record`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | `Omit`<[`AttachmentRecord`](../interfaces/AttachmentRecord.md), ``"timestamp"``\> |

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:182](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L182)

___

### uploadAttachment

▸ **uploadAttachment**(`record`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | [`AttachmentRecord`](../interfaces/AttachmentRecord.md) |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:240](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L240)

___

### uploadRecords

▸ **uploadRecords**(): `Promise`<`void`\>

Returns immediately if another loop is in progress.

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:348](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L348)

___

### watchAttachmentIds

▸ **watchAttachmentIds**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:104](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L104)

___

### watchDownloads

▸ **watchDownloads**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:402](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L402)

___

### watchUploads

▸ **watchUploads**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/AbstractAttachmentQueue.ts:337](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/AbstractAttachmentQueue.ts#L337)
