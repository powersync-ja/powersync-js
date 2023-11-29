---
id: "AbstractStreamingSyncImplementation"
title: "Class: AbstractStreamingSyncImplementation"
sidebar_label: "AbstractStreamingSyncImplementation"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`BaseObserver`](BaseObserver.md)<[`StreamingSyncImplementationListener`](../interfaces/StreamingSyncImplementationListener.md)\>

  ↳ **`AbstractStreamingSyncImplementation`**

  ↳↳ [`ReactNativeStreamingSyncImplementation`](ReactNativeStreamingSyncImplementation.md)

## Constructors

### constructor

• **new AbstractStreamingSyncImplementation**(`options`): [`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`AbstractStreamingSyncImplementationOptions`](../interfaces/AbstractStreamingSyncImplementationOptions.md) |

#### Returns

[`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

#### Overrides

[BaseObserver](BaseObserver.md).[constructor](BaseObserver.md#constructor)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:39

## Properties

### \_isConnected

• `Protected` **\_isConnected**: `boolean`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:38

___

### \_lastSyncedAt

• `Protected` **\_lastSyncedAt**: `Date`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:35

___

### delayRetry

• `Private` **delayRetry**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:55

___

### isUploadingCrud

• `Private` **isUploadingCrud**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:37

___

### listeners

• `Protected` **listeners**: `Object`

#### Index signature

▪ [id: `string`]: `Partial`<`T`\>

#### Inherited from

[BaseObserver](BaseObserver.md).[listeners](BaseObserver.md#listeners)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:8

___

### options

• `Protected` **options**: [`AbstractStreamingSyncImplementationOptions`](../interfaces/AbstractStreamingSyncImplementationOptions.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:36

___

### updateSyncStatus

• `Private` **updateSyncStatus**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:54

## Accessors

### isConnected

• `get` **isConnected**(): `boolean`

#### Returns

`boolean`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:42

___

### lastSyncedAt

• `get` **lastSyncedAt**(): `Date`

#### Returns

`Date`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:40

___

### logger

• `get` **logger**(): `ILogger`

#### Returns

`ILogger`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:41

## Methods

### \_uploadAllCrud

▸ **_uploadAllCrud**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:46

___

### getWriteCheckpoint

▸ **getWriteCheckpoint**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:48

___

### hasCompletedSync

▸ **hasCompletedSync**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:44

___

### iterateListeners

▸ **iterateListeners**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`listener`: `Partial`<[`StreamingSyncImplementationListener`](../interfaces/StreamingSyncImplementationListener.md)\>) => `any` |

#### Returns

`void`

#### Inherited from

[BaseObserver](BaseObserver.md).[iterateListeners](BaseObserver.md#iteratelisteners)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:13

___

### obtainLock

▸ **obtainLock**<`T`\>(`lockOptions`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `lockOptions` | [`LockOptions`](../interfaces/LockOptions.md)<`T`\> |

#### Returns

`Promise`<`T`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:43

___

### registerListener

▸ **registerListener**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | `Partial`<[`StreamingSyncImplementationListener`](../interfaces/StreamingSyncImplementationListener.md)\> |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Inherited from

[BaseObserver](BaseObserver.md).[registerListener](BaseObserver.md#registerlistener)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:12

___

### streamingSync

▸ **streamingSync**(`signal?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:49

___

### streamingSyncIteration

▸ **streamingSyncIteration**(`signal?`, `progress?`): `Promise`<\{ `retry?`: `boolean`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `signal?` | `AbortSignal` |
| `progress?` | () => `void` |

#### Returns

`Promise`<\{ `retry?`: `boolean`  }\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:50

___

### streamingSyncRequest

▸ **streamingSyncRequest**(`req`, `signal`): `AsyncGenerator`<[`StreamingSyncLine`](../modules.md#streamingsyncline), `any`, `unknown`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `req` | [`StreamingSyncRequest`](../interfaces/StreamingSyncRequest.md) |
| `signal` | `AbortSignal` |

#### Returns

`AsyncGenerator`<[`StreamingSyncLine`](../modules.md#streamingsyncline), `any`, `unknown`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:53

___

### triggerCrudUpload

▸ **triggerCrudUpload**(): `void`

#### Returns

`void`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:45

___

### uploadCrudBatch

▸ **uploadCrudBatch**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:47
