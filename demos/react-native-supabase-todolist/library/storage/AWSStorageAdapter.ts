import * as FileSystem from 'expo-file-system';
import { AWSConfig } from './AWSConfig';
import S3 from 'aws-sdk/clients/s3';
import { BaseStorageAdapter } from './BaseStorageAdapter';

export interface S3StorageAdapterOptions {
  client: S3;
}

export class AWSStorageAdapter extends BaseStorageAdapter {
  constructor(private options: S3StorageAdapterOptions) {
    super();
  }

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
}
