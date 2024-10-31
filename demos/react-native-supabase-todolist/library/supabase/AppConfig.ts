export const AppConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  supabaseBucket: process.env.EXPO_PUBLIC_SUPABASE_BUCKET || '',
  powersyncUrl: process.env.EXPO_PUBLIC_POWERSYNC_URL,
  region: process.env.EXPO_PUBLIC_AWS_S3_REGION,
  accessKeyId: process.env.EXPO_PUBLIC_AWS_S3_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.EXPO_PUBLIC_AWS_S3_ACCESS_SECRET_ACCESS_KEY || '',
  s3bucketName: process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME || '',
  storageOption: process.env.EXPO_PUBLIC_ATTACHMENT_STORAGE_OPTION
};
