export interface StreamingSyncRequest {
  buckets: BucketRequest[];
  include_checksum: false;
  raw_data: true;
  client_id: string;
  parameters: Record<string, unknown>;
  streams: StreamSubscriptionRequest;
  app_metadata: Record<string, string> | undefined;
}

export interface BucketRequest {
  name: string;
  after: string;
}

export interface StreamSubscriptionRequest {
  include_defaults: boolean;
  subscriptions: RequestedStreamSubscription[];
}

export interface RequestedStreamSubscription {
  stream: string;
  parameters: Record<string, unknown>;
  override_priority: number | null;
}
