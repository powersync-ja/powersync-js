---
id: "ReactNativeStreamingSyncImplementation"
title: "Class: ReactNativeStreamingSyncImplementation"
sidebar_label: "ReactNativeStreamingSyncImplementation"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

  ↳ **`ReactNativeStreamingSyncImplementation`**

## Constructors

### constructor

• **new ReactNativeStreamingSyncImplementation**(`options`): [`ReactNativeStreamingSyncImplementation`](ReactNativeStreamingSyncImplementation.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`AbstractStreamingSyncImplementationOptions`](../interfaces/AbstractStreamingSyncImplementationOptions.md) |

#### Returns

[`ReactNativeStreamingSyncImplementation`](ReactNativeStreamingSyncImplementation.md)

#### Overrides

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[constructor](AbstractStreamingSyncImplementation.md#constructor)

#### Defined in

[powersync-sdk-react-native/src/sync/stream/ReactNativeStreamingSyncImplementation.ts:11](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/sync/stream/ReactNativeStreamingSyncImplementation.ts#L11)

## Properties

### \_isConnected

• `Protected` **\_isConnected**: `boolean`

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[_isConnected](AbstractStreamingSyncImplementation.md#_isconnected)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:38

___

### \_lastSyncedAt

• `Protected` **\_lastSyncedAt**: `Date`

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[_lastSyncedAt](AbstractStreamingSyncImplementation.md#_lastsyncedat)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:35

___

### listeners

• `Protected` **listeners**: `Object`

#### Index signature

▪ [id: `string`]: `Partial`<`T`\>

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[listeners](AbstractStreamingSyncImplementation.md#listeners)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:8

___

### locks

• **locks**: `Map`<[`LockType`](../enums/LockType.md), `AsyncLock`\>

#### Defined in

[powersync-sdk-react-native/src/sync/stream/ReactNativeStreamingSyncImplementation.ts:9](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/sync/stream/ReactNativeStreamingSyncImplementation.ts#L9)

___

### options

• `Protected` **options**: [`AbstractStreamingSyncImplementationOptions`](../interfaces/AbstractStreamingSyncImplementationOptions.md)

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[options](AbstractStreamingSyncImplementation.md#options)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:36

## Accessors

### isConnected

• `get` **isConnected**(): `boolean`

#### Returns

`boolean`

#### Inherited from

AbstractStreamingSyncImplementation.isConnected

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:42

___

### lastSyncedAt

• `get` **lastSyncedAt**(): `Date`

#### Returns

`Date`

#### Inherited from

AbstractStreamingSyncImplementation.lastSyncedAt

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:40

___

### logger

• `get` **logger**(): `ILogger`

#### Returns

`ILogger`

#### Inherited from

AbstractStreamingSyncImplementation.logger

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:41

## Methods

### \_uploadAllCrud

▸ **_uploadAllCrud**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[_uploadAllCrud](AbstractStreamingSyncImplementation.md#_uploadallcrud)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:46

___

### getWriteCheckpoint

▸ **getWriteCheckpoint**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[getWriteCheckpoint](AbstractStreamingSyncImplementation.md#getwritecheckpoint)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:48

___

### hasCompletedSync

▸ **hasCompletedSync**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[hasCompletedSync](AbstractStreamingSyncImplementation.md#hascompletedsync)

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

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[iterateListeners](AbstractStreamingSyncImplementation.md#iteratelisteners)

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

#### Overrides

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[obtainLock](AbstractStreamingSyncImplementation.md#obtainlock)

#### Defined in

[powersync-sdk-react-native/src/sync/stream/ReactNativeStreamingSyncImplementation.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/sync/stream/ReactNativeStreamingSyncImplementation.ts#L18)

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

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[registerListener](AbstractStreamingSyncImplementation.md#registerlistener)

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

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[streamingSync](AbstractStreamingSyncImplementation.md#streamingsync)

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

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[streamingSyncIteration](AbstractStreamingSyncImplementation.md#streamingsynciteration)

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

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[streamingSyncRequest](AbstractStreamingSyncImplementation.md#streamingsyncrequest)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:53

___

### triggerCrudUpload

▸ **triggerCrudUpload**(): `void`

#### Returns

`void`

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[triggerCrudUpload](AbstractStreamingSyncImplementation.md#triggercrudupload)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:45

___

### uploadCrudBatch

▸ **uploadCrudBatch**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Inherited from

[AbstractStreamingSyncImplementation](AbstractStreamingSyncImplementation.md).[uploadCrudBatch](AbstractStreamingSyncImplementation.md#uploadcrudbatch)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:47
