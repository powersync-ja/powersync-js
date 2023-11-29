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

[client/sync/stream/AbstractStreamingSyncImplementation.ts:59](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L59)

## Properties

### \_isConnected

• `Protected` **\_isConnected**: `boolean`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:57](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L57)

___

### \_lastSyncedAt

• `Protected` **\_lastSyncedAt**: `Date`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:52](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L52)

___

### isUploadingCrud

• `Private` **isUploadingCrud**: `boolean`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:55](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L55)

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

• `Protected` **options**: [`AbstractStreamingSyncImplementationOptions`](../interfaces/AbstractStreamingSyncImplementationOptions.md)

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:53](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L53)

## Accessors

### isConnected

• `get` **isConnected**(): `boolean`

#### Returns

`boolean`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:74](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L74)

___

### lastSyncedAt

• `get` **lastSyncedAt**(): `Date`

#### Returns

`Date`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:66](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L66)

___

### logger

• `get` **logger**(): `ILogger`

#### Returns

`ILogger`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:70](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L70)

## Methods

### \_uploadAllCrud

▸ **_uploadAllCrud**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:91](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L91)

___

### delayRetry

▸ **delayRetry**(): `Promise`<`unknown`\>

#### Returns

`Promise`<`unknown`\>

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:314](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L314)

___

### getWriteCheckpoint

▸ **getWriteCheckpoint**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:120](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L120)

___

### hasCompletedSync

▸ **hasCompletedSync**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:80](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L80)

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

[utils/BaseObserver.ts:26](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L26)

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

[client/sync/stream/AbstractStreamingSyncImplementation.ts:78](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L78)

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

[utils/BaseObserver.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L18)

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

[client/sync/stream/AbstractStreamingSyncImplementation.ts:125](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L125)

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

[client/sync/stream/AbstractStreamingSyncImplementation.ts:142](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L142)

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

[client/sync/stream/AbstractStreamingSyncImplementation.ts:284](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L284)

___

### triggerCrudUpload

▸ **triggerCrudUpload**(): `void`

#### Returns

`void`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:84](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L84)

___

### updateSyncStatus

▸ **updateSyncStatus**(`connected`, `lastSyncedAt?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `connected` | `boolean` |
| `lastSyncedAt?` | `Date` |

#### Returns

`void`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:303](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L303)

___

### uploadCrudBatch

▸ **uploadCrudBatch**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:109](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L109)
