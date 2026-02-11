#!/usr/bin/env node

/**
 * Deploy widget to MinIO bucket
 * Uploads built widget files to MinIO with proper CORS and public access
 */

import * as Minio from 'minio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MinIO configuration from environment or defaults
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
  console.log(`📦 Checking if bucket '${BUCKET_NAME}' exists...`);
  
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  
  if (!exists) {
    console.log(`📦 Creating bucket '${BUCKET_NAME}'...`);
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

async function setBucketPolicy() {
  console.log('🔓 Setting public read policy on bucket...');
  
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
  console.log('🌐 Setting CORS policy on bucket...');
  
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
  
  // Note: MinIO CORS API might differ slightly, adjust if needed
  try {
    await minioClient.setBucketCors(BUCKET_NAME, corsConfig);
  } catch (error) {
    console.warn('⚠️  CORS setting failed (might need manual configuration):', error.message);
  }
}

async function uploadFile(localPath, remotePath, contentType) {
  console.log(`📤 Uploading ${remotePath}...`);
  
  const fileStream = fs.createReadStream(localPath);
  const fileStat = fs.statSync(localPath);
  
  const metadata = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache for versioned files
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
  
  await minioClient.putObject(
    BUCKET_NAME,
    remotePath,
    fileStream,
    fileStat.size,
    metadata
  );
  
  console.log(`✅ Uploaded ${remotePath}`);
}

async function deployWidget() {
  try {
    console.log('🚀 Starting widget deployment to MinIO...\n');
    
    // Ensure bucket exists and is configured
    await ensureBucketExists();
    await setBucketPolicy();
    await setCorsPolicy();
    
    // Upload main widget file
    const distPath = path.join(__dirname, 'dist');
    const publicPath = path.join(__dirname, 'public');
    const voxoraJsPath = path.join(distPath, 'voxora.js');
    const voxoraMapPath = path.join(distPath, 'voxora.js.map');
    const widgetHtmlPath = path.join(publicPath, 'widget.html');
    
    if (!fs.existsSync(voxoraJsPath)) {
      throw new Error('Widget build not found! Run `npm run build` first.');
    }
    
    // Upload widget JavaScript
    await uploadFile(
      voxoraJsPath,
      `${WIDGET_VERSION}/voxora.js`,
      'application/javascript'
    );
    
    // Upload source map if exists
    if (fs.existsSync(voxoraMapPath)) {
      await uploadFile(
        voxoraMapPath,
        `${WIDGET_VERSION}/voxora.js.map`,
        'application/json'
      );
    }
    
    // Upload widget HTML (chat UI)
    if (fs.existsSync(widgetHtmlPath)) {
      await uploadFile(
        widgetHtmlPath,
        `${WIDGET_VERSION}/widget.html`,
        'text/html'
      );
    } else {
      console.warn('⚠️  widget.html not found, skipping...');
    }
    
    // Get the URL
    const protocol = minioConfig.useSSL ? 'https' : 'http';
    const port = minioConfig.port === (minioConfig.useSSL ? 443 : 80) ? '' : `:${minioConfig.port}`;
    const widgetUrl = `${protocol}://${minioConfig.endPoint}${port}/${BUCKET_NAME}/${WIDGET_VERSION}/voxora.js`;
    const widgetHtmlUrl = `${protocol}://${minioConfig.endPoint}${port}/${BUCKET_NAME}/${WIDGET_VERSION}/widget.html`;
    
    console.log('\n✨ Deployment complete!\n');
    console.log('📋 Widget URLs:');
    console.log(`   Loader: ${widgetUrl}`);
    console.log(`   Chat UI: ${widgetHtmlUrl}\n`);
    console.log('📝 Embed code:');
    console.log(`   <script src="${widgetUrl}" data-voxora-public-key="YOUR_KEY" async></script>\n`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

deployWidget();
