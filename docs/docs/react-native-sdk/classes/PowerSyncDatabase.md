---
id: "PowerSyncDatabase"
title: "Class: PowerSyncDatabase"
sidebar_label: "PowerSyncDatabase"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

  ↳ **`PowerSyncDatabase`**

## Constructors

### constructor

• **new PowerSyncDatabase**(`options`): [`PowerSyncDatabase`](PowerSyncDatabase.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md) |

#### Returns

[`PowerSyncDatabase`](PowerSyncDatabase.md)

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[constructor](AbstractPowerSyncDatabase.md#constructor)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:58

## Properties

### \_isReadyPromise

• `Protected` **\_isReadyPromise**: `Promise`<`void`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[_isReadyPromise](AbstractPowerSyncDatabase.md#_isreadypromise)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:57

___

### bucketStorageAdapter

• `Protected` **bucketStorageAdapter**: [`BucketStorageAdapter`](../interfaces/BucketStorageAdapter.md)

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[bucketStorageAdapter](AbstractPowerSyncDatabase.md#bucketstorageadapter)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:55

___

### closed

• **closed**: `boolean`

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[closed](AbstractPowerSyncDatabase.md#closed)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:49

___

### currentStatus

• `Optional` **currentStatus**: [`SyncStatus`](SyncStatus.md)

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[currentStatus](AbstractPowerSyncDatabase.md#currentstatus)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:51

___

### listeners

• `Protected` **listeners**: `Object`

#### Index signature

▪ [id: `string`]: `Partial`<`T`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[listeners](AbstractPowerSyncDatabase.md#listeners)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:8

___

### options

• `Protected` **options**: [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[options](AbstractPowerSyncDatabase.md#options)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:43

___

### ready

• **ready**: `boolean`

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[ready](AbstractPowerSyncDatabase.md#ready)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:50

___

### sdkVersion

• **sdkVersion**: `string`

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[sdkVersion](AbstractPowerSyncDatabase.md#sdkversion)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:53

___

### syncStreamImplementation

• `Optional` **syncStreamImplementation**: [`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[syncStreamImplementation](AbstractPowerSyncDatabase.md#syncstreamimplementation)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:52

___

### transactionMutex

▪ `Static` `Protected` **transactionMutex**: `Mutex`

Transactions should be queued in the DBAdapter, but we also want to prevent
calls to `.execute` while an async transaction is running.

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[transactionMutex](AbstractPowerSyncDatabase.md#transactionmutex)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:48

## Accessors

### connected

• `get` **connected**(): `boolean`

#### Returns

`boolean`

#### Inherited from

AbstractPowerSyncDatabase.connected

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:61

___

### database

• `get` **database**(): [`DBAdapter`](../interfaces/DBAdapter.md)

#### Returns

[`DBAdapter`](../interfaces/DBAdapter.md)

#### Inherited from

AbstractPowerSyncDatabase.database

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:60

___

### schema

• `get` **schema**(): [`Schema`](Schema.md)

#### Returns

[`Schema`](Schema.md)

#### Inherited from

AbstractPowerSyncDatabase.schema

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:59

## Methods

### \_initialize

▸ **_initialize**(): `Promise`<`void`\>

Allows for extended implementations to execute custom initialization
logic as part of the total init process

#### Returns

`Promise`<`void`\>

#### Overrides

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[_initialize](AbstractPowerSyncDatabase.md#_initialize)

#### Defined in

[powersync-sdk-react-native/src/db/PowerSyncDatabase.ts:12](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/PowerSyncDatabase.ts#L12)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[close](AbstractPowerSyncDatabase.md#close)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:95

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[connect](AbstractPowerSyncDatabase.md#connect)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:86

___

### disconnect

▸ **disconnect**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[disconnect](AbstractPowerSyncDatabase.md#disconnect)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:87

___

### disconnectAndClear

▸ **disconnectAndClear**(): `Promise`<`void`\>

Disconnect and clear the database.
 Use this when logging out.
 The database can still be queried after this is called, but the tables
 would be empty.

#### Returns

`Promise`<`void`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[disconnectAndClear](AbstractPowerSyncDatabase.md#disconnectandclear)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:94

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[execute](AbstractPowerSyncDatabase.md#execute)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:135

___

### generateBucketStorageAdapter

▸ **generateBucketStorageAdapter**(): [`BucketStorageAdapter`](../interfaces/BucketStorageAdapter.md)

#### Returns

[`BucketStorageAdapter`](../interfaces/BucketStorageAdapter.md)

#### Overrides

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[generateBucketStorageAdapter](AbstractPowerSyncDatabase.md#generatebucketstorageadapter)

#### Defined in

[powersync-sdk-react-native/src/db/PowerSyncDatabase.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/PowerSyncDatabase.ts#L14)

___

### generateSyncStreamImplementation

▸ **generateSyncStreamImplementation**(`connector`): [`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `connector` | [`PowerSyncBackendConnector`](../interfaces/PowerSyncBackendConnector.md) |

#### Returns

[`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Overrides

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[generateSyncStreamImplementation](AbstractPowerSyncDatabase.md#generatesyncstreamimplementation)

#### Defined in

[powersync-sdk-react-native/src/db/PowerSyncDatabase.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/PowerSyncDatabase.ts#L18)

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[get](AbstractPowerSyncDatabase.md#get)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:147

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[getAll](AbstractPowerSyncDatabase.md#getall)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:139

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[getCrudBatch](AbstractPowerSyncDatabase.md#getcrudbatch)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:117

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[getNextCrudTransaction](AbstractPowerSyncDatabase.md#getnextcrudtransaction)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:131

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[getOptional](AbstractPowerSyncDatabase.md#getoptional)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:143

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[getUploadQueueStats](AbstractPowerSyncDatabase.md#getuploadqueuestats)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:99

___

### init

▸ **init**(): `Promise`<`void`\>

Wait for initialization to complete.
While initializing is automatic, this helps to catch and report initialization errors.

#### Returns

`Promise`<`void`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[init](AbstractPowerSyncDatabase.md#init)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:82

___

### initialize

▸ **initialize**(): `Promise`<`void`\>

Entry point for executing initialization logic.
This is to be automatically executed in the constructor.

#### Returns

`Promise`<`void`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[initialize](AbstractPowerSyncDatabase.md#initialize)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:77

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

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[iterateListeners](AbstractPowerSyncDatabase.md#iteratelisteners)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:13

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[onChange](AbstractPowerSyncDatabase.md#onchange)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:170

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[readLock](AbstractPowerSyncDatabase.md#readlock)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:153

___

### readTransaction

▸ **readTransaction**<`T`\>(`callback`, `lockTimeout?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`tx`: [`Transaction`](../interfaces/Transaction.md)) => `Promise`<`T`\> |
| `lockTimeout?` | `number` |

#### Returns

`Promise`<`T`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[readTransaction](AbstractPowerSyncDatabase.md#readtransaction)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:159

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

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[registerListener](AbstractPowerSyncDatabase.md#registerlistener)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:12

___

### waitForReady

▸ **waitForReady**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

A promise which will resolve once initialization is completed.

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[waitForReady](AbstractPowerSyncDatabase.md#waitforready)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:67

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[watch](AbstractPowerSyncDatabase.md#watch)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:161

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

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[writeLock](AbstractPowerSyncDatabase.md#writelock)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:158

___

### writeTransaction

▸ **writeTransaction**<`T`\>(`callback`, `lockTimeout?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`tx`: [`Transaction`](../interfaces/Transaction.md)) => `Promise`<`T`\> |
| `lockTimeout?` | `number` |

#### Returns

`Promise`<`T`\>

#### Inherited from

[AbstractPowerSyncDatabase](AbstractPowerSyncDatabase.md).[writeTransaction](AbstractPowerSyncDatabase.md#writetransaction)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:160
