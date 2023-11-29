---
id: "AbstractPowerSyncDatabaseOpenFactory"
title: "Class: AbstractPowerSyncDatabaseOpenFactory"
sidebar_label: "AbstractPowerSyncDatabaseOpenFactory"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new AbstractPowerSyncDatabaseOpenFactory**(`options`): [`AbstractPowerSyncDatabaseOpenFactory`](AbstractPowerSyncDatabaseOpenFactory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`PowerSyncOpenFactoryOptions`](../interfaces/PowerSyncOpenFactoryOptions.md) |

#### Returns

[`AbstractPowerSyncDatabaseOpenFactory`](AbstractPowerSyncDatabaseOpenFactory.md)

#### Defined in

[client/AbstractPowerSyncOpenFactory.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncOpenFactory.ts#L18)

## Properties

### options

• `Protected` **options**: [`PowerSyncOpenFactoryOptions`](../interfaces/PowerSyncOpenFactoryOptions.md)

#### Defined in

[client/AbstractPowerSyncOpenFactory.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncOpenFactory.ts#L18)

## Accessors

### schema

• `get` **schema**(): [`Schema`](Schema.md)

#### Returns

[`Schema`](Schema.md)

#### Defined in

[client/AbstractPowerSyncOpenFactory.ts:20](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncOpenFactory.ts#L20)

## Methods

### generateInstance

▸ **generateInstance**(`options`): [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md) |

#### Returns

[`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Defined in

[client/AbstractPowerSyncOpenFactory.ts:33](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncOpenFactory.ts#L33)

___

### generateOptions

▸ **generateOptions**(): [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Returns

[`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Defined in

[client/AbstractPowerSyncOpenFactory.ts:26](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncOpenFactory.ts#L26)

___

### getInstance

▸ **getInstance**(): [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Returns

[`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Defined in

[client/AbstractPowerSyncOpenFactory.ts:35](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncOpenFactory.ts#L35)

___

### openDB

▸ **openDB**(): [`DBAdapter`](../interfaces/DBAdapter.md)

#### Returns

[`DBAdapter`](../interfaces/DBAdapter.md)

#### Defined in

[client/AbstractPowerSyncOpenFactory.ts:24](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncOpenFactory.ts#L24)
