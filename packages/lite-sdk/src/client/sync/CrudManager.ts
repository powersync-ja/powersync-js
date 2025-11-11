export type UploadContext = {
  /**
   * @param writeCheckpoint - Optional write checkpoint to set the local target to
   *  - If provided, only updates if all CRUD items have been uploaded
   *  - If not provided, sets the local target to the max op id
   * @returns
   */
  complete: (writeCheckpoint?: string) => Promise<void>;
};

/**
 * Interface for managing CRUD operations in PowerSync.
 *
 * CrudManager is responsible for:
 * - Tracking CRUD items
 * - Performing uploads of CRUD items
 * - Marking CRUD items as completed
 */
export interface CrudManager {
  /**
   * Checks if there are any CRUD items to upload.
   * @returns true if there are any CRUD items to upload, false otherwise
   */
  hasCrud: () => Promise<boolean>;
  /**
   * Performs the upload of the CRUD items.
   * @param context - The upload context
   * @returns void
   */
  performUpload: (context: UploadContext) => Promise<void>;
}
