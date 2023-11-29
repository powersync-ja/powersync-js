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

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:21

___

### logger

• `Optional` **logger**: `ILogger`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:24

___

### remote

• **remote**: [`AbstractRemote`](../classes/AbstractRemote.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:22

___

### retryDelayMs

• `Optional` **retryDelayMs**: `number`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:25

___

### uploadCrud

• **uploadCrud**: () => `Promise`<`void`\>

#### Type declaration

▸ (): `Promise`<`void`\>

##### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:23
