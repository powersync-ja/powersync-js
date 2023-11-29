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

[utils/BaseObserver.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L14)

## Properties

### listeners

• `Protected` **listeners**: `Object`

#### Index signature

▪ [id: `string`]: `Partial`<`T`\>

#### Defined in

[utils/BaseObserver.ts:12](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L12)

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

[utils/BaseObserver.ts:26](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L26)

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

[utils/BaseObserver.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L18)
