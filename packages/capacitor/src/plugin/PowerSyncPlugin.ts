export type RegistrationResponse = {
  /**
   * Zero for successful registration, non-zero for failure.
   */
  responseCode: number;
};

export const messageForErrorCode = (code: number): string => {
  switch (code) {
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
