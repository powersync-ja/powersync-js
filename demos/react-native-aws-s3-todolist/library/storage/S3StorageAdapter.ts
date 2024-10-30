import { StorageAdapter } from '@powersync/attachments';
import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { AWSConfig } from './AWSConfig';
import S3 from 'aws-sdk/clients/s3';

export interface S3StorageAdapterOptions {
  client: S3;
}

class S3StorageAdapter implements StorageAdapter {
  constructor(private options: S3StorageAdapterOptions) {}

  async uploadFile(
    filename: string,
    data: ArrayBuffer,
    options?: {
      mediaType?: string;
    }
  ): Promise<void> {
    if (!AWSConfig.bucketName) {
      throw new Error('AWS S3 bucket not configured in AppConfig.ts');
    }

    try {
      const body = Uint8Array.from(new Uint8Array(data));
      const params = {
        Bucket: AWSConfig.bucketName,
        Key: filename,
        Body: body,
        ContentType: options?.mediaType
      };

      await this.options.client.upload(params).promise();
      console.log(`File uploaded successfully to ${AWSConfig.bucketName}/${filename}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async downloadFile(filePath: string): Promise<Blob> {
    const s3 = new S3({
      region: AWSConfig.region,
      accessKeyId: AWSConfig.accessKeyId,
      secretAccessKey: AWSConfig.secretAccessKey
    });

    const params = {
      Bucket: AWSConfig.bucketName,
      Key: filePath
    };

    try {
      const obj = await s3.getObject(params).promise();
      if (obj.Body) {
        const data = await new Response(obj.Body as ReadableStream).arrayBuffer();
        return new Blob([data]);
      } else {
        throw new Error('Object body is undefined. Could not download file.');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  async writeFile(
    fileURI: string,
    base64Data: string,
    options?: {
      encoding?: FileSystem.EncodingType;
    }
  ): Promise<void> {
    const { encoding = FileSystem.EncodingType.UTF8 } = options ?? {};
    await FileSystem.writeAsStringAsync(fileURI, base64Data, { encoding });
  }

  async readFile(
    fileURI: string,
    options?: { encoding?: FileSystem.EncodingType; mediaType?: string }
  ): Promise<ArrayBuffer> {
    const { encoding = FileSystem.EncodingType.UTF8 } = options ?? {};
    const { exists } = await FileSystem.getInfoAsync(fileURI);
    if (!exists) {
      throw new Error(`File does not exist: ${fileURI}`);
    }
    const fileContent = await FileSystem.readAsStringAsync(fileURI, options);
    if (encoding === FileSystem.EncodingType.Base64) {
      return this.base64ToArrayBuffer(fileContent);
    }
    return this.stringToArrayBuffer(fileContent);
  }
  async deleteFile(uri: string, options?: { filename?: string }): Promise<void> {
    if (await this.fileExists(uri)) {
      await FileSystem.deleteAsync(uri);
    }

    const { filename } = options ?? {};
    if (!filename) {
      return;
    }

    if (!AWSConfig.bucketName) {
      throw new Error('Supabase bucket not configured in AppConfig.ts');
    }

    try {
      const params = {
        Bucket: AWSConfig.bucketName,
        Key: filename
      };
      await this.options.client.deleteObject(params).promise();
      console.log(`${filename} deleted successfully from ${AWSConfig.bucketName}.`);
    } catch (error) {
      console.error(`Error deleting ${filename} from ${AWSConfig.bucketName}:`, error);
    }
  }

  async fileExists(fileURI: string): Promise<boolean> {
    const { exists } = await FileSystem.getInfoAsync(fileURI);
    return exists;
  }

  async makeDir(uri: string): Promise<void> {
    const { exists } = await FileSystem.getInfoAsync(uri);
    if (!exists) {
      await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
    }
  }

  async copyFile(sourceUri: string, targetUri: string): Promise<void> {
    await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
  }

  getUserStorageDirectory(): string {
    return FileSystem.documentDirectory!;
  }

  async stringToArrayBuffer(str: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  /**
   * Converts a base64 string to an ArrayBuffer
   */
  async base64ToArrayBuffer(base64: string): Promise<ArrayBuffer> {
    return decodeBase64(base64);
  }
}

export default S3StorageAdapter;
