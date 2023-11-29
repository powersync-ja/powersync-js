---
id: "AbstractPowerSyncDatabase"
title: "Class: AbstractPowerSyncDatabase"
sidebar_label: "AbstractPowerSyncDatabase"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`BaseObserver`](BaseObserver.md)<[`PowerSyncDBListener`](../interfaces/PowerSyncDBListener.md)\>

  ↳ **`AbstractPowerSyncDatabase`**

## Constructors

### constructor

• **new AbstractPowerSyncDatabase**(`options`): [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md) |

#### Returns

[`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Overrides

[BaseObserver](BaseObserver.md).[constructor](BaseObserver.md#constructor)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:77](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L77)

## Properties

### \_isReadyPromise

• `Protected` **\_isReadyPromise**: `Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:75](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L75)

___

### abortController

• `Private` **abortController**: `AbortController`

#### Defined in

[client/AbstractPowerSyncDatabase.ts:72](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L72)

___

### bucketStorageAdapter

• `Protected` **bucketStorageAdapter**: [`BucketStorageAdapter`](../interfaces/BucketStorageAdapter.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:73](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L73)

___

### closed

• **closed**: `boolean`

#### Defined in

[client/AbstractPowerSyncDatabase.ts:65](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L65)

___

### currentStatus

• `Optional` **currentStatus**: [`SyncStatus`](SyncStatus.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:68](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L68)

___

### listeners

• `Protected` **listeners**: `Object`

#### Index signature

▪ [id: `string`]: `Partial`<`T`\>

#### Inherited from

[BaseObserver](BaseObserver.md).[listeners](BaseObserver.md#listeners)

#### Defined in

[utils/BaseObserver.ts:12](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L12)

___

### options

• `Protected` **options**: [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:77](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L77)

___

### ready

• **ready**: `boolean`

#### Defined in

[client/AbstractPowerSyncDatabase.ts:66](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L66)

___

### sdkVersion

• **sdkVersion**: `string`

#### Defined in

[client/AbstractPowerSyncDatabase.ts:70](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L70)

___

### syncStatusListenerDisposer

• `Private` `Optional` **syncStatusListenerDisposer**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

[client/AbstractPowerSyncDatabase.ts:74](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L74)

___

### syncStreamImplementation

• `Optional` **syncStreamImplementation**: [`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:69](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L69)

___

### transactionMutex

▪ `Static` `Protected` **transactionMutex**: `Mutex`

Transactions should be queued in the DBAdapter, but we also want to prevent
calls to `.execute` while an async transaction is running.

#### Defined in

[client/AbstractPowerSyncDatabase.ts:63](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L63)

## Accessors

### connected

• `get` **connected**(): `boolean`

#### Returns

`boolean`

#### Defined in

[client/AbstractPowerSyncDatabase.ts:97](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L97)

___

### database

• `get` **database**(): [`DBAdapter`](../interfaces/DBAdapter.md)

#### Returns

[`DBAdapter`](../interfaces/DBAdapter.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:93](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L93)

___

### schema

• `get` **schema**(): [`Schema`](Schema.md)

#### Returns

[`Schema`](Schema.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:89](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L89)

## Methods

### \_initialize

▸ **_initialize**(): `Promise`<`void`\>

Allows for extended implementations to execute custom initialization
logic as part of the total init process

#### Returns

`Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:122](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L122)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:210](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L210)

___

### connect

▸ **connect**(`connector`): `Promise`<`void`\>

Connects to stream of events from PowerSync instance

#### Parameters

| Name | Type |
| :------ | :------ |
| `connector` | [`PowerSyncBackendConnector`](../interfaces/PowerSyncBackendConnector.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:149](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L149)

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:168](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L168)

___

### disconnectAndClear

▸ **disconnectAndClear**(): `Promise`<`void`\>

Disconnect and clear the database.
 Use this when logging out.
 The database can still be queried after this is called, but the tables
 would be empty.

#### Returns

`Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:180](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L180)

___

### execute

▸ **execute**(`sql`, `parameters?`): `Promise`<[`QueryResult`](../interfaces/QueryResult.md)\>

Execute a statement and optionally return results

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

#### Returns

`Promise`<[`QueryResult`](../interfaces/QueryResult.md)\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:340](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L340)

___

### executeReadOnly

▸ **executeReadOnly**(`sql`, `params`): `Promise`<[`QueryResult`](../interfaces/QueryResult.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `params` | `any`[] |

#### Returns

`Promise`<[`QueryResult`](../interfaces/QueryResult.md)\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:496](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L496)

___

### generateBucketStorageAdapter

▸ **generateBucketStorageAdapter**(): [`BucketStorageAdapter`](../interfaces/BucketStorageAdapter.md)

#### Returns

[`BucketStorageAdapter`](../interfaces/BucketStorageAdapter.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:105](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L105)

___

### generateSyncStreamImplementation

▸ **generateSyncStreamImplementation**(`connector`): [`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `connector` | [`PowerSyncBackendConnector`](../interfaces/PowerSyncBackendConnector.md) |

#### Returns

[`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Defined in

[client/AbstractPowerSyncDatabase.ts:101](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L101)

___

### get

▸ **get**<`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

Execute a read-only query and return the first result, error if the ResultSet is empty.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

#### Returns

`Promise`<`T`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:364](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L364)

___

### getAll

▸ **getAll**<`T`\>(`sql`, `parameters?`): `Promise`<`T`[]\>

Execute a read-only query and return results

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

#### Returns

`Promise`<`T`[]\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:348](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L348)

___

### getCrudBatch

▸ **getCrudBatch**(`limit`): `Promise`<[`CrudBatch`](CrudBatch.md)\>

Get a batch of crud data to upload.

Returns null if there is no data to upload.

Use this from the [PowerSyncBackendConnector.uploadData]` callback.

Once the data have been successfully uploaded, call [CrudBatch.complete] before
requesting the next batch.

Use [limit] to specify the maximum number of updates to return in a single
batch.

This method does include transaction ids in the result, but does not group
data by transaction. One batch may contain data from multiple transactions,
and a single transaction may be split over multiple batches.

#### Parameters

| Name | Type |
| :------ | :------ |
| `limit` | `number` |

#### Returns

`Promise`<[`CrudBatch`](CrudBatch.md)\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:252](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L252)

___

### getNextCrudTransaction

▸ **getNextCrudTransaction**(): `Promise`<[`CrudTransaction`](CrudTransaction.md)\>

Get the next recorded transaction to upload.

Returns null if there is no data to upload.

Use this from the [PowerSyncBackendConnector.uploadData]` callback.

Once the data have been successfully uploaded, call [CrudTransaction.complete] before
requesting the next transaction.

Unlike [getCrudBatch], this only returns data from a single transaction at a time.
All data for the transaction is loaded into memory.

#### Returns

`Promise`<[`CrudTransaction`](CrudTransaction.md)\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:296](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L296)

___

### getOptional

▸ **getOptional**<`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

Execute a read-only query and return the first result, or null if the ResultSet is empty.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

#### Returns

`Promise`<`T`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:356](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L356)

___

### getUploadQueueStats

▸ **getUploadQueueStats**(`includeSize?`): `Promise`<[`UploadQueueStats`](UploadQueueStats.md)\>

Get upload queue size estimate and count.

#### Parameters

| Name | Type |
| :------ | :------ |
| `includeSize?` | `boolean` |

#### Returns

`Promise`<[`UploadQueueStats`](UploadQueueStats.md)\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:220](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L220)

___

### init

▸ **init**(): `Promise`<`void`\>

Wait for initialization to complete.
While initializing is automatic, this helps to catch and report initialization errors.

#### Returns

`Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:142](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L142)

___

### initialize

▸ **initialize**(): `Promise`<`void`\>

Entry point for executing initialization logic.
This is to be automatically executed in the constructor.

#### Returns

`Promise`<`void`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:128](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L128)

___

### iterateListeners

▸ **iterateListeners**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`listener`: `Partial`<[`PowerSyncDBListener`](../interfaces/PowerSyncDBListener.md)\>) => `any` |

#### Returns

`void`

#### Inherited from

[BaseObserver](BaseObserver.md).[iterateListeners](BaseObserver.md#iteratelisteners)

#### Defined in

[utils/BaseObserver.ts:26](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L26)

___

### onChange

▸ **onChange**(`options?`): `AsyncIterable`<[`WatchOnChangeEvent`](../interfaces/WatchOnChangeEvent.md)\>

Create a Stream of changes to any of the specified tables.

This is preferred over [watch] when multiple queries need to be performed
together when data is changed.

Note, do not declare this as `async *onChange` as it will not work in React Native

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`SQLWatchOptions`](../interfaces/SQLWatchOptions.md) |

#### Returns

`AsyncIterable`<[`WatchOnChangeEvent`](../interfaces/WatchOnChangeEvent.md)\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:456](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L456)

___

### readLock

▸ **readLock**<`T`\>(`callback`): `Promise`<`T`\>

Takes a read lock, without starting a transaction.

In most cases, [readTransaction] should be used instead.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`db`: [`DBAdapter`](../interfaces/DBAdapter.md)) => `Promise`<`T`\> |

#### Returns

`Promise`<`T`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:374](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L374)

___

### readTransaction

▸ **readTransaction**<`T`\>(`callback`, `lockTimeout?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `callback` | (`tx`: [`Transaction`](../interfaces/Transaction.md)) => `Promise`<`T`\> | `undefined` |
| `lockTimeout` | `number` | `DEFAULT_LOCK_TIMEOUT_MS` |

#### Returns

`Promise`<`T`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:392](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L392)

___

### registerListener

▸ **registerListener**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | `Partial`<[`PowerSyncDBListener`](../interfaces/PowerSyncDBListener.md)\> |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Inherited from

[BaseObserver](BaseObserver.md).[registerListener](BaseObserver.md#registerlistener)

#### Defined in

[utils/BaseObserver.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L18)

___

### waitForReady

▸ **waitForReady**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

A promise which will resolve once initialization is completed.

#### Defined in

[client/AbstractPowerSyncDatabase.ts:110](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L110)

___

### watch

▸ **watch**(`sql`, `parameters?`, `options?`): `AsyncIterable`<[`QueryResult`](../interfaces/QueryResult.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |
| `options?` | [`SQLWatchOptions`](../interfaces/SQLWatchOptions.md) |

#### Returns

`AsyncIterable`<[`QueryResult`](../interfaces/QueryResult.md)\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:423](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L423)

___

### writeLock

▸ **writeLock**<`T`\>(`callback`): `Promise`<`T`\>

Takes a global lock, without starting a transaction.
In most cases, [writeTransaction] should be used instead.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`db`: [`DBAdapter`](../interfaces/DBAdapter.md)) => `Promise`<`T`\> |

#### Returns

`Promise`<`T`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:383](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L383)

___

### writeTransaction

▸ **writeTransaction**<`T`\>(`callback`, `lockTimeout?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `callback` | (`tx`: [`Transaction`](../interfaces/Transaction.md)) => `Promise`<`T`\> | `undefined` |
| `lockTimeout` | `number` | `DEFAULT_LOCK_TIMEOUT_MS` |

#### Returns

`Promise`<`T`\>

#### Defined in

[client/AbstractPowerSyncDatabase.ts:407](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L407)
