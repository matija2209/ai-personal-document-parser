import { NextResponse } from 'next/server';
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_CONFIG } from '@/lib/r2-client';

export async function POST() {
  try {
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedMethods: ['PUT', 'GET', 'POST', 'DELETE'],
          AllowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
          AllowedHeaders: [
            'content-type',
            'content-length',
            'authorization',
            'x-amz-content-sha256',
            'x-amz-date',
            'x-amz-security-token',
            'x-amz-user-agent',
            'x-amz-checksum-algorithm',
            'x-amz-checksum-crc32',
            'x-amz-sdk-checksum-algorithm',
            'x-amz-meta-documenttype',
            'x-amz-meta-originalfilename',
            'x-amz-meta-uploadedat',
            'x-amz-meta-userid'
          ],
          ExposeHeaders: [
            'etag',
            'x-amz-meta-documenttype',
            'x-amz-meta-originalfilename',
            'x-amz-meta-uploadedat',
            'x-amz-meta-userid'
          ],
          MaxAgeSeconds: 3600,
        },
      ],
    };

    const command = new PutBucketCorsCommand({
      Bucket: R2_CONFIG.bucketName,
      CORSConfiguration: corsConfiguration,
    });

    await r2Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'CORS configuration applied successfully',
      corsConfiguration
    });

  } catch (error) {
    console.error('Error setting CORS:', error);
    return NextResponse.json(
      { 
        error: 'Failed to set CORS configuration', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}