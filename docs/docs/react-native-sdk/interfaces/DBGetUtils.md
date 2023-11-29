---
id: "DBGetUtils"
title: "Interface: DBGetUtils"
sidebar_label: "DBGetUtils"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- **`DBGetUtils`**

  ↳ [`LockContext`](LockContext.md)

  ↳ [`DBAdapter`](DBAdapter.md)

## Methods

### get

▸ **get**<`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

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

powersync-sdk-common/lib/db/DBAdapter.d.ts:34

___

### getAll

▸ **getAll**<`T`\>(`sql`, `parameters?`): `Promise`<`T`[]\>

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

powersync-sdk-common/lib/db/DBAdapter.d.ts:32

___

### getOptional

▸ **getOptional**<`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

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

powersync-sdk-common/lib/db/DBAdapter.d.ts:33
