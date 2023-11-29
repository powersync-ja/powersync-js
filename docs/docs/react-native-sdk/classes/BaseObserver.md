---
id: "BaseObserver"
title: "Class: BaseObserver<T>"
sidebar_label: "BaseObserver"
sidebar_position: 0
custom_edit_url: null
---

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`BaseListener`](../modules.md#baselistener) = [`BaseListener`](../modules.md#baselistener) |

## Hierarchy

- **`BaseObserver`**

  ↳ [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

  ↳ [`AbstractStreamingSyncImplementation`](AbstractStreamingSyncImplementation.md)

  ↳ [`RNQSDBAdapter`](RNQSDBAdapter.md)

## Implements

- [`BaseObserverInterface`](../interfaces/BaseObserverInterface.md)<`T`\>

## Constructors

### constructor

• **new BaseObserver**<`T`\>(): [`BaseObserver`](BaseObserver.md)<`T`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`BaseListener`](../modules.md#baselistener) = [`BaseListener`](../modules.md#baselistener) |

#### Returns

[`BaseObserver`](BaseObserver.md)<`T`\>

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:11

## Properties

### listeners

• `Protected` **listeners**: `Object`

#### Index signature

▪ [id: `string`]: `Partial`<`T`\>

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:8

## Methods

### iterateListeners

▸ **iterateListeners**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`listener`: `Partial`<`T`\>) => `any` |

#### Returns

`void`

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:13

___

### registerListener

▸ **registerListener**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | `Partial`<`T`\> |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Implementation of

[BaseObserverInterface](../interfaces/BaseObserverInterface.md).[registerListener](../interfaces/BaseObserverInterface.md#registerlistener)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:12
