---
id: "StorageAdapter"
title: "Interface: StorageAdapter"
sidebar_label: "StorageAdapter"
sidebar_position: 0
custom_edit_url: null
---

## Methods

### copyFile

▸ **copyFile**(`sourceUri`, `targetUri`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `sourceUri` | `string` |
| `targetUri` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:32](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L32)

___

### deleteFile

▸ **deleteFile**(`uri`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `uri` | `string` |
| `options?` | `Object` |
| `options.filename?` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:26](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L26)

___

### downloadFile

▸ **downloadFile**(`filePath`): `Promise`<`Blob`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePath` | `string` |

#### Returns

`Promise`<`Blob`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:13](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L13)

___

### fileExists

▸ **fileExists**(`fileURI`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `fileURI` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:28](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L28)

___

### getUserStorageDirectory

▸ **getUserStorageDirectory**(): `string`

Returns the directory where user data is stored.
Should end with a '/'

#### Returns

`string`

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:38](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L38)

___

### makeDir

▸ **makeDir**(`uri`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `uri` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:30](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L30)

___

### readFile

▸ **readFile**(`fileURI`, `options?`): `Promise`<`ArrayBuffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `fileURI` | `string` |
| `options?` | `Object` |
| `options.encoding?` | [`EncodingType`](../enums/EncodingType.md) |
| `options.mediaType?` | `string` |

#### Returns

`Promise`<`ArrayBuffer`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:21](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L21)

___

### uploadFile

▸ **uploadFile**(`filePath`, `data`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePath` | `string` |
| `data` | `ArrayBuffer` |
| `options?` | `Object` |
| `options.mediaType?` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:7](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L7)

___

### writeFile

▸ **writeFile**(`fileURI`, `base64Data`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `fileURI` | `string` |
| `base64Data` | `string` |
| `options?` | `Object` |
| `options.encoding?` | [`EncodingType`](../enums/EncodingType.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[powersync-attachments/src/StorageAdapter.ts:15](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/StorageAdapter.ts#L15)
