#!/usr/bin/env node

import * as Minio from 'minio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9001'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
};

const BUCKET_NAME = 'voxora-widget';
const WIDGET_VERSION = 'v1';

const minioClient = new Minio.Client(minioConfig);

async function ensureBucketExists() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

async function setBucketPolicy() {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
      },
    ],
  };
  await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
}

async function setCorsPolicy() {
  const corsConfig = {
    CORSRules: [
      {
        AllowedOrigins: ['*'],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 86400,
      },
    ],
  };
  try {
    await minioClient.setBucketCors(BUCKET_NAME, corsConfig);
  } catch (error) {
    console.warn('CORS setting failed:', error.message);
  }
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.js': return 'application/javascript';
    case '.mjs': return 'application/javascript';
    case '.css': return 'text/css';
    case '.html': return 'text/html';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function getCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // HTML should never be immutable; always allow fetching latest shell.
  if (ext === '.html') {
    return 'no-cache, no-store, must-revalidate';
  }

  // Versioned but unhashed assets: short cache to balance freshness and performance.
  if (ext === '.js' || ext === '.mjs' || ext === '.css') {
    return 'public, max-age=300';
  }

  // Default for static binary assets.
  return 'public, max-age=86400';
}

async function uploadFile(localPath, remotePath) {
  const contentType = getContentType(localPath);
  const fileStream = fs.createReadStream(localPath);
  const fileStat = fs.statSync(localPath);
  
  const metadata = {
    'Content-Type': contentType,
    'Cache-Control': getCacheControl(localPath),
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
  
  await minioClient.putObject(BUCKET_NAME, remotePath, fileStream, fileStat.size, metadata);
  console.log(`✅ Uploaded ${remotePath}`);
}

async function uploadDir(localDirPath, remoteDirPrefix) {
  const files = fs.readdirSync(localDirPath);
  for (const file of files) {
    const fullPath = path.join(localDirPath, file);
    const stat = fs.statSync(fullPath);
    const remotePath = `${remoteDirPrefix}/${file}`;
    
    if (stat.isDirectory()) {
      await uploadDir(fullPath, remotePath);
    } else {
      await uploadFile(fullPath, remotePath);
    }
  }
}

async function deployWidget() {
  try {
    console.log('🚀 Starting widget deployment to MinIO...\n');
    
    await ensureBucketExists();
    await setBucketPolicy();
    await setCorsPolicy();
    
    const distPath = path.join(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('Widget build not found! Run `npm run build` first.');
    }
    
    await uploadDir(distPath, WIDGET_VERSION);
    
    const protocol = minioConfig.useSSL ? 'https' : 'http';
    const port = minioConfig.port === (minioConfig.useSSL ? 443 : 80) ? '' : `:${minioConfig.port}`;
    const widgetUrl = `${protocol}://${minioConfig.endPoint}${port}/${BUCKET_NAME}/${WIDGET_VERSION}/voxora.js`;
    
    console.log('\n✨ Deployment complete!');
    console.log(`   Loader: ${widgetUrl}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

deployWidget();
