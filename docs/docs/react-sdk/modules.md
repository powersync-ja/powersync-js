---
id: "modules"
title: "@journeyapps/powersync-react"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Variables

### PowerSyncContext

• `Const` **PowerSyncContext**: `Context`<`AbstractPowerSyncDatabase`\>

#### Defined in

[hooks/PowerSyncContext.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-react/src/hooks/PowerSyncContext.ts#L4)

## Functions

### usePowerSync

▸ **usePowerSync**(): `AbstractPowerSyncDatabase`

#### Returns

`AbstractPowerSyncDatabase`

#### Defined in

[hooks/PowerSyncContext.ts:5](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-react/src/hooks/PowerSyncContext.ts#L5)

___

### usePowerSyncQuery

▸ **usePowerSyncQuery**<`T`\>(`sqlStatement`, `parameters?`): `T`[]

A hook to access a single static query.
For an updated result, use usePowerSyncWatchedQuery instead

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `sqlStatement` | `string` | `undefined` |
| `parameters` | `any`[] | `[]` |

#### Returns

`T`[]

#### Defined in

[hooks/usePowerSyncQuery.ts:8](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-react/src/hooks/usePowerSyncQuery.ts#L8)

___

### usePowerSyncWatchedQuery

▸ **usePowerSyncWatchedQuery**<`T`\>(`sqlStatement`, `parameters?`, `options?`): `T`[]

A hook to access the results of a watched query.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `sqlStatement` | `string` | `undefined` |
| `parameters` | `any`[] | `[]` |
| `options` | `Omit`<`SQLWatchOptions`, ``"signal"``\> | `{}` |

#### Returns

`T`[]

#### Defined in

[hooks/usePowerSyncWatchedQuery.ts:8](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-react/src/hooks/usePowerSyncWatchedQuery.ts#L8)
