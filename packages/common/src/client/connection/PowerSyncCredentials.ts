export interface PowerSyncCredentials {
  endpoint: string;
  token: string;
  expiresAt?: Date;
  params?: Record<string, any>;
}
