---
id: "AbstractPowerSyncDatabaseOpenFactory"
title: "Class: AbstractPowerSyncDatabaseOpenFactory"
sidebar_label: "AbstractPowerSyncDatabaseOpenFactory"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- **`AbstractPowerSyncDatabaseOpenFactory`**

  ↳ [`RNQSPowerSyncDatabaseOpenFactory`](RNQSPowerSyncDatabaseOpenFactory.md)

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

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:17

## Properties

### options

• `Protected` **options**: [`PowerSyncOpenFactoryOptions`](../interfaces/PowerSyncOpenFactoryOptions.md)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:16

## Accessors

### schema

• `get` **schema**(): [`Schema`](Schema.md)

#### Returns

[`Schema`](Schema.md)

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

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:21

___

### generateOptions

▸ **generateOptions**(): [`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Returns

[`PowerSyncDatabaseOptions`](../interfaces/PowerSyncDatabaseOptions.md)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:20

___

### getInstance

▸ **getInstance**(): [`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Returns

[`AbstractPowerSyncDatabase`](AbstractPowerSyncDatabase.md)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:22

___

### openDB

▸ **openDB**(): [`DBAdapter`](../interfaces/DBAdapter.md)

#### Returns

[`DBAdapter`](../interfaces/DBAdapter.md)

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncOpenFactory.d.ts:19
