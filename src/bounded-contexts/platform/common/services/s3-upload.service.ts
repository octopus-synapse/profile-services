import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import {
  StorageConfigurationException,
  StorageObjectNotFoundException,
  StorageUploadFailedException,
} from '../exceptions/platform.exceptions';

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

/**
 * Framework-free S3/MinIO upload service. POJO consumed by both the
 * Nest `useFactory` shell and the Elysia bootstrap via
 * `buildS3UploadService(config, logger)`.
 *
 * Reads MinIO env via the injected `ConfigPort` so it stays portable
 * between Nest's `ConfigService` and the Bun `ProcessEnvConfigAdapter`.
 * The `MINIO_PUBLIC_ENDPOINT` URL fallback is also routed through the
 * port to avoid `process.env` reads inside the class body.
 */
export class S3UploadService {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private _isEnabled: boolean;
  private readonly publicEndpoint: string | undefined;

  constructor(
    private readonly config: ConfigPort,
    private readonly logger: LoggerPort,
  ) {
    const parsed = MinioConfigSchema.safeParse({
      MINIO_ENDPOINT: this.config.get<string>('MINIO_ENDPOINT'),
      MINIO_ACCESS_KEY: this.config.get<string>('MINIO_ACCESS_KEY'),
      MINIO_SECRET_KEY: this.config.get<string>('MINIO_SECRET_KEY'),
      MINIO_BUCKET: this.config.get<string>('MINIO_BUCKET'),
    });

    this.publicEndpoint = this.config.get<string>('MINIO_PUBLIC_ENDPOINT');

    if (!parsed.success) {
      this.logger.error('MinIO config invalid — service disabled', {
        context: 'S3UploadService',
        stack: JSON.stringify(parsed.error.flatten()),
      });
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
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: true, // Required for MinIO
        });
        this.bucket = bucket ?? null;
        this.logger.log('MinIO upload service initialized', 'S3UploadService', {
          endpoint,
          bucket,
        });
      } catch (error) {
        this.logger.error('Failed to initialize MinIO client', {
          context: 'S3UploadService',
          stack: error instanceof Error ? error.stack : undefined,
        });
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
    options: { acl?: 'public-read' | 'private' } = {},
  ): Promise<{ url: string; key: string } | null> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      this.logger.warn('S3 upload attempted but service is disabled', 'S3UploadService');
      return null;
    }

    // P0-015: ACL is now an explicit parameter. Profile photos and
    // company logos default to `public-read` (consistent with their
    // semantic of being part of a public profile in the social network).
    // Posts MUST pass `private` — feed posts can carry restricted
    // content that's only visible to the author's connections, and
    // downloads should go through presigned GETs with `Cache-Control:
    // private, max-age=300` so a CDN can't serve a leaked URL across
    // users.
    const acl = options.acl ?? 'public-read';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: acl,
    });

    await this.client.send(command);

    // Build MinIO URL — use public endpoint if available (for Docker networking)
    const endpoint = this.publicEndpoint ?? this.config.get<string>('MINIO_ENDPOINT');
    const url = `${endpoint}/${this.bucket}/${key}`;

    this.logger.log('File uploaded to MinIO successfully', 'S3UploadService', {
      key,
      contentType,
      acl,
    });

    return { url, key };
  }

  /**
   * Stream an object back as a Buffer. Returns `null` on miss or when
   * the service is disabled. Errors other than NoSuchKey propagate so
   * the caller can decide whether to fail open or treat as miss.
   */
  async downloadFile(key: string): Promise<Buffer | null> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      return null;
    }
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      const response = await this.client.send(command);
      if (!response.Body) return null;
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      if (error instanceof NoSuchKey || (error as { name?: string })?.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      this.logger.warn('MinIO delete attempted but service is disabled', 'S3UploadService');
      return false;
    }

    try {
      const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });

      await this.client.send(command);

      this.logger.log('File deleted from MinIO successfully', 'S3UploadService', { key });

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file from MinIO: ${key}`, {
        context: 'S3UploadService',
        stack: error instanceof Error ? error.stack : undefined,
      });
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
   * Strict variant of `uploadFile` that throws typed domain exceptions
   * instead of returning `null`. Callers that have no graceful fallback
   * (e.g. PDF render persistence) should prefer this so the envelope
   * carries a stable `STORAGE_*` code instead of a generic 500.
   */
  async uploadFileStrict(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      throw new StorageConfigurationException();
    }

    try {
      const result = await this.uploadFile(file, key, contentType);
      if (!result) {
        throw new StorageUploadFailedException('upload returned null');
      }
      return result;
    } catch (error) {
      if (error instanceof StorageConfigurationException) throw error;
      if (error instanceof StorageUploadFailedException) throw error;
      const reason = error instanceof Error ? error.message : 'unknown error';
      throw new StorageUploadFailedException(reason);
    }
  }

  /**
   * Strict variant of `downloadFile` that throws when the object is
   * missing or storage is offline.
   */
  async downloadFileStrict(key: string): Promise<Buffer> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      throw new StorageConfigurationException();
    }
    const buffer = await this.downloadFile(key);
    if (!buffer) {
      throw new StorageObjectNotFoundException(key);
    }
    return buffer;
  }

  /**
   * Upload an object as private and return a pre-signed GET URL with TTL.
   * Used for one-shot downloads (resume export, admin reports) where the
   * frontend hands the URL directly to the browser via `<a href download>`.
   * Object is NOT public-read — only the signed URL grants access, and
   * only until `ttlSeconds` elapses.
   */
  async uploadAndPresign(opts: {
    key: string;
    body: Buffer;
    contentType: string;
    filename: string;
    ttlSeconds: number;
  }): Promise<{ downloadUrl: string; expiresAt: string }> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      throw new StorageConfigurationException();
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: opts.key,
          Body: opts.body,
          ContentType: opts.contentType,
          ContentDisposition: `attachment; filename="${opts.filename.replace(/"/g, '')}"`,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      throw new StorageUploadFailedException(reason);
    }

    // Sign with the public-facing endpoint when configured so the browser
    // can resolve the URL (the in-cluster MinIO host is unreachable from
    // the user's machine).
    const presignClient = this.publicEndpoint
      ? new S3Client({
          endpoint: this.publicEndpoint,
          region: 'us-east-1',
          credentials: {
            accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') ?? '',
            secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') ?? '',
          },
          forcePathStyle: true,
        })
      : this.client;

    const downloadUrl = await getSignedUrl(
      // biome-ignore lint/suspicious/noExplicitAny: hoisted @smithy/types versions diverge between s3-request-presigner sub-dep and top-level @smithy/types
      presignClient as any,
      // biome-ignore lint/suspicious/noExplicitAny: same reason
      new GetObjectCommand({ Bucket: this.bucket, Key: opts.key }) as any,
      { expiresIn: opts.ttlSeconds },
    );

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + opts.ttlSeconds * 1000).toISOString(),
    };
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
      this.logger.error('S3/MinIO connection check failed', {
        context: 'S3UploadService',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }
}
