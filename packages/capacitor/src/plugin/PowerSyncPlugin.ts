export type RegistrationResponse = {
  responseCode: number;
};
export interface PowerSyncPlugin {
  registerCore(): Promise<RegistrationResponse>;
}
