export type RegistrationResponse = {
  /**
   * Zero for successful registration, non-zero for failure.
   * - [Android] -1: SQLCipher library not found.
   * - [Android] -2: Required symbols not found.
   * - The result of sqlite3_auto_extension
   */
  responseCode: number;
};

export interface PowerSyncPlugin {
  /**
   * Registers the PowerSync core extension with the SQLite library.
   */
  registerCore(): Promise<RegistrationResponse>;
}
