import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class S3UploadService {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private readonly isEnabled: boolean;

  constructor(private readonly logger: AppLoggerService) {
    const endpoint = process.env.MINIO_ENDPOINT;
    const accessKeyId = process.env.MINIO_ACCESS_KEY;
    const secretAccessKey = process.env.MINIO_SECRET_KEY;
    const bucket = process.env.MINIO_BUCKET;

    this.isEnabled = !!(endpoint && accessKeyId && secretAccessKey && bucket);

    if (this.isEnabled) {
      try {
        this.client = new S3Client({
          endpoint: endpoint!,
          region: 'us-east-1', // MinIO requires a region but doesn't use it
          credentials: {
            accessKeyId: accessKeyId!,
            secretAccessKey: secretAccessKey!,
          },
          forcePathStyle: true, // Required for MinIO
        });
        this.bucket = bucket || null;
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
        this.isEnabled = false;
      }
    } else {
      this.logger.warn(
        'MinIO upload service disabled - missing configuration',
        'S3UploadService',
      );
    }
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ url: string; key: string } | null> {
    if (!this.isEnabled || !this.client || !this.bucket) {
      this.logger.warn(
        'S3 upload attempted but service is disabled',
        'S3UploadService',
      );
      return null;
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await this.client.send(command);

      // Build MinIO URL
      const endpoint = process.env.MINIO_ENDPOINT;
      const url = `${endpoint}/${this.bucket}/${key}`;

      this.logger.log(
        'File uploaded to MinIO successfully',
        'S3UploadService',
        {
          key,
          contentType,
        },
      );

      return { url, key };
    } catch (error) {
      this.logger.error(
        `Failed to upload file to MinIO: ${key}`,
        error instanceof Error ? error.stack : undefined,
        'S3UploadService',
      );
      throw error;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.client || !this.bucket) {
      this.logger.warn(
        'MinIO delete attempted but service is disabled',
        'S3UploadService',
      );
      return false;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);

      this.logger.log(
        'File deleted from MinIO successfully',
        'S3UploadService',
        {
          key,
        },
      );

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

  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}
