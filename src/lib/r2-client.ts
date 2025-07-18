import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const R2_CONFIG = {
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  presignedUrlExpiry: 300, // 5 minutes
};

export async function testR2Connection(): Promise<boolean> {
  try {
    await r2Client.send(new HeadBucketCommand({
      Bucket: R2_CONFIG.bucketName,
    }));
    return true;
  } catch (error) {
    console.error('R2 connection test failed:', error);
    return false;
  }
}

export function handleR2Error(error: any): string {
  if (error.name === 'NoSuchBucket') {
    return 'Bucket does not exist. Please check your bucket name.';
  }
  if (error.name === 'InvalidAccessKeyId') {
    return 'Invalid access key. Please check your R2 credentials.';
  }
  if (error.name === 'SignatureDoesNotMatch') {
    return 'Authentication failed. Please check your secret key.';
  }
  if (error.name === 'AccessDenied') {
    return 'Access denied. Please check your API token permissions.';
  }
  return `R2 operation failed: ${error.message || 'Unknown error'}`;
}