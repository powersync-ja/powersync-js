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

powersync-sdk-common/lib/utils/BaseObserver.d.ts:2
