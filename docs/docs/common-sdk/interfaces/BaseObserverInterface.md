---
id: "BaseObserverInterface"
title: "Interface: BaseObserverInterface<T>"
sidebar_label: "BaseObserverInterface"
sidebar_position: 0
custom_edit_url: null
---

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`BaseListener`](../modules.md#baselistener) |

## Hierarchy

- **`BaseObserverInterface`**

  ↳ [`DBAdapter`](DBAdapter.md)

## Implemented by

- [`BaseObserver`](../classes/BaseObserver.md)

## Methods

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

#### Defined in

[utils/BaseObserver.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L4)
