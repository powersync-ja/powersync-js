---
id: "ReactNativeRemote"
title: "Class: ReactNativeRemote"
sidebar_label: "ReactNativeRemote"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`AbstractRemote`](AbstractRemote.md)

  ↳ **`ReactNativeRemote`**

## Constructors

### constructor

• **new ReactNativeRemote**(`connector`, `logger?`): [`ReactNativeRemote`](ReactNativeRemote.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `connector` | [`RemoteConnector`](../modules.md#remoteconnector) |
| `logger?` | `ILogger` |

#### Returns

[`ReactNativeRemote`](ReactNativeRemote.md)

#### Inherited from

[AbstractRemote](AbstractRemote.md).[constructor](AbstractRemote.md#constructor)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:12

## Properties

### connector

• `Protected` **connector**: [`RemoteConnector`](../modules.md#remoteconnector)

#### Inherited from

[AbstractRemote](AbstractRemote.md).[connector](AbstractRemote.md#connector)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:9

___

### credentials

• `Protected` `Optional` **credentials**: [`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)

#### Inherited from

[AbstractRemote](AbstractRemote.md).[credentials](AbstractRemote.md#credentials)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:11

___

### logger

• `Protected` **logger**: `ILogger`

#### Inherited from

[AbstractRemote](AbstractRemote.md).[logger](AbstractRemote.md#logger)

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

#### Overrides

[AbstractRemote](AbstractRemote.md).[get](AbstractRemote.md#get)

#### Defined in

[powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts:25](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts#L25)

___

### getCredentials

▸ **getCredentials**(): `Promise`<[`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)\>

#### Returns

`Promise`<[`PowerSyncCredentials`](../interfaces/PowerSyncCredentials.md)\>

#### Inherited from

[AbstractRemote](AbstractRemote.md).[getCredentials](AbstractRemote.md#getcredentials)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:13

___

### getHeaders

▸ **getHeaders**(): `Promise`<\{ `Authorization`: `string` ; `content-type`: `string`  }\>

#### Returns

`Promise`<\{ `Authorization`: `string` ; `content-type`: `string`  }\>

#### Inherited from

[AbstractRemote](AbstractRemote.md).[getHeaders](AbstractRemote.md#getheaders)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:15

___

### getToken

▸ **getToken**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

#### Inherited from

[AbstractRemote](AbstractRemote.md).[getToken](AbstractRemote.md#gettoken)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:14

___

### isAvailable

▸ **isAvailable**(): `boolean`

#### Returns

`boolean`

#### Inherited from

[AbstractRemote](AbstractRemote.md).[isAvailable](AbstractRemote.md#isavailable)

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
| `headers` | `Record`<`string`, `string`\> |

#### Returns

`Promise`<`any`\>

#### Overrides

[AbstractRemote](AbstractRemote.md).[post](AbstractRemote.md#post)

#### Defined in

[powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts:7](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts#L7)

___

### postStreaming

▸ **postStreaming**(`path`, `data`, `headers?`, `signal?`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `data` | `any` |
| `headers` | `Record`<`string`, `string`\> |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`<`any`\>

#### Overrides

[AbstractRemote](AbstractRemote.md).[postStreaming](AbstractRemote.md#poststreaming)

#### Defined in

[powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts:43](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts#L43)
