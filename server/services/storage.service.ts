import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from '../config/env.ts';

export class StorageService {
  private s3Client: S3Client | null = null;
  private bucket: string;
  private uploadsDir: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || 'tradex-campus-assets';
    this.uploadsDir = path.resolve(process.cwd(), 'uploads');

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'eu-central-1',
        endpoint: process.env.AWS_ENDPOINT_URL_S3, // Supports Neon Object Storage, AWS S3, Cloudflare R2, MinIO
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
        forcePathStyle: true,
      });
    }

    // Ensure local uploads directory exists for offline / local mode
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  isS3Configured(): boolean {
    return this.s3Client !== null;
  }

  /**
   * Generates a presigned S3 PUT URL for direct browser-to-bucket upload.
   */
  async getPresignedUploadUrl(options: {
    folder?: string;
    filename: string;
    contentType: string;
  }) {
    const folder = options.folder || 'listings';
    const ext = path.extname(options.filename) || '.jpg';
    const key = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;

    if (this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: options.contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
      const endpoint = process.env.AWS_ENDPOINT_URL_S3 || `https://${this.bucket}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com`;
      const fileUrl = `${endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;

      return {
        uploadUrl,
        fileUrl,
        key,
        method: 'PUT' as const,
        storage: 'S3' as const,
      };
    }

    // Fallback for local development when S3 credentials are not set
    const baseUrl = `http://localhost:${ENV.PORT}`;
    const fileUrl = `${baseUrl}/uploads/${key}`;
    const uploadUrl = `${baseUrl}/api/upload/direct`;

    return {
      uploadUrl,
      fileUrl,
      key,
      method: 'POST' as const,
      storage: 'LOCAL' as const,
    };
  }

  /**
   * Offloads a Base64 encoded image string to S3 or local disk storage,
   * returning a clean URL to store in PostgreSQL.
   */
  async uploadBase64Image(base64Str: string, folder = 'listings'): Promise<string> {
    if (!base64Str.startsWith('data:image/')) {
      return base64Str; // Already a URL or static path
    }

    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      return base64Str;
    }

    const mimeSubtype = matches[1].toLowerCase();
    const ext = mimeSubtype === 'jpeg' ? '.jpg' : `.${mimeSubtype}`;
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const contentType = `image/${mimeSubtype}`;

    const key = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;

    // Upload to S3 if configured
    if (this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const endpoint = process.env.AWS_ENDPOINT_URL_S3 || `https://${this.bucket}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com`;
      return `${endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }

    // Otherwise, save to local disk
    const targetFolder = path.join(this.uploadsDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const filePath = path.join(this.uploadsDir, key);
    fs.writeFileSync(filePath, buffer);

    const baseUrl = `http://localhost:${ENV.PORT}`;
    return `${baseUrl}/uploads/${key}`;
  }
}

export const storageService = new StorageService();
