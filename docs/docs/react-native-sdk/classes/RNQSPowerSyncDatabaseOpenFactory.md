---
id: "RNQSPowerSyncDatabaseOpenFactory"
title: "Class: RNQSPowerSyncDatabaseOpenFactory"
sidebar_label: "RNQSPowerSyncDatabaseOpenFactory"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`AbstractPowerSyncDatabaseOpenFactory`](AbstractPowerSyncDatabaseOpenFactory.md)

  ↳ **`RNQSPowerSyncDatabaseOpenFactory`**

## Constructors

### constructor

• **new RNQSPowerSyncDatabaseOpenFactory**(`options`): [`RNQSPowerSyncDatabaseOpenFactory`](RNQSPowerSyncDatabaseOpenFactory.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`PowerSyncOpenFactoryOptions`](../interfaces/PowerSyncOpenFactoryOptions.md) |

#### Returns

[`RNQSPowerSyncDatabaseOpenFactory`](RNQSPowerSyncDatabaseOpenFactory.md)

#### Inherited from

[AbstractPowerSyncDatabaseOpenFactory](AbstractPowerSyncDatabaseOpenFactory.md).[constructor](AbstractPowerSyncDatabaseOpenFactory.md#constructor)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:17

## Properties

### options

• `Protected` **options**: [`PowerSyncOpenFactoryOptions`](../interfaces/PowerSyncOpenFactoryOptions.md)

#### Inherited from

[AbstractPowerSyncDatabaseOpenFactory](AbstractPowerSyncDatabaseOpenFactory.md).[options](AbstractPowerSyncDatabaseOpenFactory.md#options)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:16

## Accessors

### schema

• `get` **schema**(): [`Schema`](Schema.md)

#### Returns

[`Schema`](Schema.md)

#### Inherited from

AbstractPowerSyncDatabaseOpenFactory.schema

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:18

## Methods

### generateInstance

▸ **generateInstance**(`options`): [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md) |

#### Returns

[`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Overrides

[AbstractPowerSyncDatabaseOpenFactory](AbstractPowerSyncDatabaseOpenFactory.md).[generateInstance](AbstractPowerSyncDatabaseOpenFactory.md#generateinstance)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBOpenFactory.ts:40](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBOpenFactory.ts#L40)

___

### generateOptions

▸ **generateOptions**(): [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Returns

[`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Inherited from

[AbstractPowerSyncDatabaseOpenFactory](AbstractPowerSyncDatabaseOpenFactory.md).[generateOptions](AbstractPowerSyncDatabaseOpenFactory.md#generateoptions)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:20

___

### getInstance

▸ **getInstance**(): [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Returns

[`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Inherited from

[AbstractPowerSyncDatabaseOpenFactory](AbstractPowerSyncDatabaseOpenFactory.md).[getInstance](AbstractPowerSyncDatabaseOpenFactory.md#getinstance)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:22

___

### openDB

▸ **openDB**(): [`DBAdapter`](../interfaces/DBAdapter.md)

#### Returns

[`DBAdapter`](../interfaces/DBAdapter.md)

#### Overrides

[AbstractPowerSyncDatabaseOpenFactory](AbstractPowerSyncDatabaseOpenFactory.md).[openDB](AbstractPowerSyncDatabaseOpenFactory.md#opendb)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBOpenFactory.ts:13](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBOpenFactory.ts#L13)
