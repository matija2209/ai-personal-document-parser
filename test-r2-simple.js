const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  }
});

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${envVars.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: envVars.R2_ACCESS_KEY_ID,
    secretAccessKey: envVars.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function test() {
  console.log('Testing R2 connection...');
  console.log('Account ID:', envVars.R2_ACCOUNT_ID);
  console.log('Bucket Name:', envVars.R2_BUCKET_NAME);
  console.log('Access Key ID:', envVars.R2_ACCESS_KEY_ID?.substring(0, 10) + '...');
  
  try {
    await client.send(new HeadBucketCommand({
      Bucket: envVars.R2_BUCKET_NAME,
    }));
    console.log('✅ R2 connection successful!');
    console.log('✅ Bucket exists and is accessible');
  } catch (error) {
    console.log('❌ R2 connection failed:', error.message);
    console.log('Error code:', error.name);
  }
}

test();