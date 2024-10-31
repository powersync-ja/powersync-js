export const AWSConfig = {
  region: process.env.EXPO_PUBLIC_AWS_S3_REGION,
  accessKeyId: process.env.EXPO_PUBLIC_AWS_S3_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.EXPO_PUBLIC_AWS_S3_ACCESS_SECRET_ACCESS_KEY || '',
  bucketName: process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME || ''
};
