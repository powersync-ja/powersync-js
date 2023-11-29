---
id: "AbstractStreamingSyncImplementationOptions"
title: "Interface: AbstractStreamingSyncImplementationOptions"
sidebar_label: "AbstractStreamingSyncImplementationOptions"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### adapter

• **adapter**: [`BucketStorageAdapter`](BucketStorageAdapter.md)

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:35](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L35)

___

### logger

• `Optional` **logger**: `ILogger`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:38](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L38)

___

### remote

• **remote**: [`AbstractRemote`](../classes/AbstractRemote.md)

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:36](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L36)

___

### retryDelayMs

• `Optional` **retryDelayMs**: `number`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:39](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L39)

___

### uploadCrud

• **uploadCrud**: () => `Promise`<`void`\>

#### Type declaration

▸ (): `Promise`<`void`\>

##### Returns

`Promise`<`void`\>

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:37](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L37)
