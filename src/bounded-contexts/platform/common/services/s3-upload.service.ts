import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppLoggerService } from '../logger/logger.service';

const MinioConfigSchema = z.object({
  MINIO_ENDPOINT: z.string().url().optional(),
  MINIO_ACCESS_KEY: z.string().min(3).optional(),
  MINIO_SECRET_KEY: z.string().min(3).optional(),
  MINIO_BUCKET: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9.-]+$/, 'Bucket must be lowercase alphanumeric with dots/hyphens')
    .optional(),
});

@Injectable()
export class S3UploadService {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private _isEnabled: boolean;

  constructor(private readonly logger: AppLoggerService) {
    const parsed = MinioConfigSchema.safeParse({
      MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
      MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
      MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
      MINIO_BUCKET: process.env.MINIO_BUCKET,
    });

    if (!parsed.success) {
      this.logger.error(
        'MinIO config invalid — service disabled',
        JSON.stringify(parsed.error.flatten()),
        'S3UploadService',
      );
      this._isEnabled = false;
      return;
    }

    const {
      MINIO_ENDPOINT: endpoint,
      MINIO_ACCESS_KEY: accessKeyId,
      MINIO_SECRET_KEY: secretAccessKey,
      MINIO_BUCKET: bucket,
    } = parsed.data;
    this._isEnabled = !!(endpoint && accessKeyId && secretAccessKey && bucket);

    if (this._isEnabled && endpoint && accessKeyId && secretAccessKey) {
      try {
        this.client = new S3Client({
          endpoint,
          region: 'us-east-1', // MinIO requires a region but doesn't use it
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: true, // Required for MinIO
        });
        this.bucket = bucket ?? null;
        this.logger.log('MinIO upload service initialized', 'S3UploadService', {
          endpoint,
          bucket,
        });
      } catch (error) {
        this.logger.error(
          'Failed to initialize MinIO client',
          error instanceof Error ? error.stack : undefined,
          'S3UploadService',
        );
        this._isEnabled = false;
      }
    } else {
      this.logger.warn('MinIO upload service disabled - missing configuration', 'S3UploadService');
    }
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ url: string; key: string } | null> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      this.logger.warn('S3 upload attempted but service is disabled', 'S3UploadService');
      return null;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await this.client.send(command);

    // Build MinIO URL — use public endpoint if available (for Docker networking)
    const endpoint = process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT;
    const url = `${endpoint}/${this.bucket}/${key}`;

    this.logger.log('File uploaded to MinIO successfully', 'S3UploadService', {
      key,
      contentType,
    });

    return { url, key };
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      this.logger.warn('MinIO delete attempted but service is disabled', 'S3UploadService');
      return false;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      this.logger.log('File deleted from MinIO successfully', 'S3UploadService', {
        key,
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete file from MinIO: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'S3UploadService',
      );
      return false;
    }
  }

  /**
   * Check if S3/MinIO is enabled
   */
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  /**
   * Check connection to S3/MinIO bucket
   */
  async checkConnection(): Promise<boolean> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      return false;
    }

    try {
      const command = new HeadBucketCommand({ Bucket: this.bucket });
      await this.client.send(command);
      return true;
    } catch (error) {
      this.logger.error(
        'S3/MinIO connection check failed',
        error instanceof Error ? error.stack : undefined,
        'S3UploadService',
      );
      return false;
    }
  }
}
