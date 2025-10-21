import { AttachmentRecord } from "./Schema.js";

export interface RemoteStorageAdapter {
    /**
     * Uploads a file to remote storage.
     *
     * @param fileData The binary content of the file to upload.
     * @param attachment The associated `Attachment` metadata describing the file.
     * @throws An error if the upload fails.
     */
    uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void>;
    /**
     * Downloads a file from remote storage.
     *
     * @param attachment The `Attachment` describing the file to download.
     * @returns The binary data of the downloaded file.
     * @throws An error if the download fails or the file is not found.
     */
    downloadFile(attachment: AttachmentRecord): Promise<Blob>;
    /**
     * Deletes a file from remote storage.
     *
     * @param attachment The `Attachment` describing the file to delete.
     * @throws An error if the deletion fails or the file does not exist.
     */
    deleteFile(attachment: AttachmentRecord): Promise<void>;
} 