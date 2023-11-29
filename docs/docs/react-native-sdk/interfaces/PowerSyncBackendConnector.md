---
id: "PowerSyncBackendConnector"
title: "Interface: PowerSyncBackendConnector"
sidebar_label: "PowerSyncBackendConnector"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### fetchCredentials

• **fetchCredentials**: () => `Promise`<[`PowerSyncCredentials`](PowerSyncCredentials.md)\>

#### Type declaration

▸ (): `Promise`<[`PowerSyncCredentials`](PowerSyncCredentials.md)\>

Get credentials for PowerSync.

This should always fetch a fresh set of credentials - don't use cached
values.

Return null if the user is not signed in. Throw an error if credentials
cannot be fetched due to a network error or other temporary error.

This token is kept for the duration of a sync connection.

##### Returns

`Promise`<[`PowerSyncCredentials`](PowerSyncCredentials.md)\>

#### Defined in

powersync-sdk-common/lib/client/connection/PowerSyncBackendConnector.d.ts:14

___

### uploadData

• **uploadData**: (`database`: [`AbstractPowerSyncDatabase`](../classes/AbstractPowerSyncDatabase.md)) => `Promise`<`void`\>

#### Type declaration

▸ (`database`): `Promise`<`void`\>

Upload local changes to the app backend.

Use [PowerSyncDatabase.getCrudBatch] to get a batch of changes to upload. See [DevConnector] for an example implementation.

Any thrown errors will result in a retry after the configured wait period (default: 5 seconds).

##### Parameters

| Name | Type |
| :------ | :------ |
| `database` | [`AbstractPowerSyncDatabase`](../classes/AbstractPowerSyncDatabase.md) |

##### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/connection/PowerSyncBackendConnector.d.ts:21
