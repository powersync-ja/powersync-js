---
id: "AbstractRemote"
title: "Class: AbstractRemote"
sidebar_label: "AbstractRemote"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- **`AbstractRemote`**

  ↳ [`ReactNativeRemote`](ReactNativeRemote.md)

## Constructors

### constructor

• **new AbstractRemote**(`connector`, `logger?`): [`AbstractRemote`](AbstractRemote.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `connector` | [`RemoteConnector`](../modules.md#remoteconnector) |
| `logger?` | `ILogger` |

#### Returns

[`AbstractRemote`](AbstractRemote.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:12

## Properties

### connector

• `Protected` **connector**: [`RemoteConnector`](../modules.md#remoteconnector)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:9

___

### credentials

• `Protected` `Optional` **credentials**: [`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:11

___

### logger

• `Protected` **logger**: `ILogger`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:10

## Methods

### get

▸ **get**(`path`, `headers?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `headers?` | `Record`<`string`, `string`\> |

#### Returns

`Promise`<`any`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:20

___

### getCredentials

▸ **getCredentials**(): `Promise`<[`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)\>

#### Returns

`Promise`<[`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:13

___

### getHeaders

▸ **getHeaders**(): `Promise`<\{ `Authorization`: `string` ; `content-type`: `string`  }\>

#### Returns

`Promise`<\{ `Authorization`: `string` ; `content-type`: `string`  }\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:15

___

### getToken

▸ **getToken**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:14

___

### isAvailable

▸ **isAvailable**(): `boolean`

#### Returns

`boolean`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:22

___

### post

▸ **post**(`path`, `data`, `headers?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `data` | `any` |
| `headers?` | `Record`<`string`, `string`\> |

#### Returns

`Promise`<`any`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:19

___

### postStreaming

▸ **postStreaming**(`path`, `data`, `headers?`, `signal?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `data` | `any` |
| `headers?` | `Record`<`string`, `string`\> |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`<`any`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:21
