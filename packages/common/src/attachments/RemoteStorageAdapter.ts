import { AttachmentRecord } from "./Schema.js";

/**
 * RemoteStorageAdapter defines the interface for remote storage operations.
 * Implementations handle uploading, downloading, and deleting files from remote storage.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export interface RemoteStorageAdapter {
    /**
     * Uploads a file to remote storage.
     * @param fileData The binary content of the file to upload
     * @param attachment The associated attachment metadata
     */
    uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void>;
    
    /**
     * Downloads a file from remote storage.
     * @param attachment The attachment describing the file to download
     * @returns The binary data of the downloaded file
     */
    downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer>;
    
    /**
     * Deletes a file from remote storage.
     * @param attachment The attachment describing the file to delete
     */
    deleteFile(attachment: AttachmentRecord): Promise<void>;
} 