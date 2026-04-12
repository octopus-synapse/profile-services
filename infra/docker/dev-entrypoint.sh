#!/bin/sh
set -e

echo "🪣 Ensuring MinIO bucket exists..."
# Create bucket using a simple bun script (S3 SDK is already available)
bun -e "
const { S3Client, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY, secretAccessKey: process.env.MINIO_SECRET_KEY },
  forcePathStyle: true,
});
const bucket = process.env.MINIO_BUCKET || 'profile-uploads';
(async () => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log('  ✅ Bucket already exists:', bucket);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log('  ✅ Bucket created:', bucket);
  }
})().catch(e => console.warn('  ⚠️  Bucket setup warning:', e.message));
" 2>&1 || echo "  ⚠️  Bucket setup skipped"

echo "🗄️  Running database setup..."
bun run db:setup
bun run prisma:seed

echo "🚀 Starting dev server..."
bun run start:dev &
APP_PID=$!

# Wait for app to be ready, then generate theme previews in background
(
  echo "⏳ Waiting for app to start before generating theme previews..."
  for i in $(seq 1 60); do
    if wget -q -O /dev/null "http://localhost:${PORT:-3001}/api/docs" 2>/dev/null; then
      echo "🎨 Generating theme previews..."
      bun run scripts/generate-theme-previews.ts 2>&1 || echo "  ⚠️  Theme preview generation failed (non-fatal)"
      break
    fi
    sleep 3
  done
) &

wait $APP_PID
