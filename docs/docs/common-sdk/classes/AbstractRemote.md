---
id: "AbstractRemote"
title: "Class: AbstractRemote"
sidebar_label: "AbstractRemote"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new AbstractRemote**(`connector`, `logger?`): [`AbstractRemote`](AbstractRemote.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `connector` | [`RemoteConnector`](../modules.md#remoteconnector) | `undefined` |
| `logger` | `ILogger` | `DEFAULT_REMOTE_LOGGER` |

#### Returns

[`AbstractRemote`](AbstractRemote.md)

#### Defined in

[client/sync/stream/AbstractRemote.ts:16](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L16)

## Properties

### connector

• `Protected` **connector**: [`RemoteConnector`](../modules.md#remoteconnector)

#### Defined in

[client/sync/stream/AbstractRemote.ts:16](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L16)

___

### credentials

• `Protected` `Optional` **credentials**: [`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)

#### Defined in

[client/sync/stream/AbstractRemote.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L14)

___

### logger

• `Protected` **logger**: `ILogger` = `DEFAULT_REMOTE_LOGGER`

#### Defined in

[client/sync/stream/AbstractRemote.ts:16](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L16)

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

[client/sync/stream/AbstractRemote.ts:47](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L47)

___

### getCredentials

▸ **getCredentials**(): `Promise`<[`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)\>

#### Returns

`Promise`<[`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)\>

#### Defined in

[client/sync/stream/AbstractRemote.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L18)

___

### getHeaders

▸ **getHeaders**(): `Promise`<\{ `Authorization`: `string` ; `content-type`: `string` = 'application/json' }\>

#### Returns

`Promise`<\{ `Authorization`: `string` ; `content-type`: `string` = 'application/json' }\>

#### Defined in

[client/sync/stream/AbstractRemote.ts:38](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L38)

___

### getToken

▸ **getToken**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Defined in

[client/sync/stream/AbstractRemote.ts:27](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L27)

___

### isAvailable

▸ **isAvailable**(): `boolean`

#### Returns

`boolean`

#### Defined in

[client/sync/stream/AbstractRemote.ts:50](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L50)

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

[client/sync/stream/AbstractRemote.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L46)

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

[client/sync/stream/AbstractRemote.ts:48](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L48)
