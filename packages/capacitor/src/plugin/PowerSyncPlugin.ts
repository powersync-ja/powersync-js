export type RegistrationResponse = {
  /**
   * Zero for successful registration, non-zero for failure.
   * - [Android] -1: SQLCipher library not found.
   * - [Android] -2: Required symbols not found.
   * - The result of sqlite3_auto_extension
   */
  responseCode: number;
};

export const messageForErrorCode = (code: number): string => {
  switch (code) {
    case -1:
      return '[Android] SQLCipher library not found';
    case -2:
      return '[Android] Required symbols not found';
    case 0:
      return 'Success';
    default:
      return `Extension registration failed with SQLite error code: ${code}`;
  }
};

export interface PowerSyncPlugin {
  /**
   * Registers the PowerSync core extension with the SQLite library.
   */
  registerCore(): Promise<RegistrationResponse>;
}
