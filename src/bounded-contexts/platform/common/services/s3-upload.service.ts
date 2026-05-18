import { Client as MinioClient, S3Error } from 'minio';
import { z } from 'zod';
import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import {
  StorageConfigurationException,
  StorageObjectNotFoundException,
  StorageUploadFailedException,
} from '../exceptions/platform.exceptions';

// Private uploads (post images, resume exports, restricted artefacts) are
// returned to clients via presigned GETs. The 5-minute window matches the
// presign TTL used today and prevents intermediary CDNs from sharing a
// leaked URL across users (`private` ⇒ shared caches must not store).
const PRIVATE_CACHE_CONTROL = 'private, max-age=300';

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

interface ParsedEndpoint {
  readonly endPoint: string;
  readonly port: number;
  readonly useSSL: boolean;
}

function parseEndpoint(url: string): ParsedEndpoint {
  const u = new URL(url);
  const useSSL = u.protocol === 'https:';
  const port = u.port ? Number(u.port) : useSSL ? 443 : 80;
  return { endPoint: u.hostname, port, useSSL };
}

/**
 * Framework-free MinIO upload service. POJO consumed by the Elysia
 * bootstrap via `buildS3UploadService(config, logger)`.
 *
 * Reads MinIO env via the injected `ConfigPort` so it stays portable
 * between the legacy Nest `ConfigService` and the Bun
 * `ProcessEnvConfigAdapter`. The `MINIO_PUBLIC_ENDPOINT` URL fallback
 * is also routed through the port to avoid `process.env` reads inside
 * the class body.
 *
 * Backed by the official `minio` SDK — no AWS SDK dep — because the
 * deployment target is MinIO (self-hosted S3-compatible). The class
 * name stays `S3UploadService` for now to avoid a wide rename across
 * BCs; a follow-up can rename to `StorageService` if desired.
 */
export class S3UploadService {
  private client: MinioClient | null = null;
  private presignClient: MinioClient | null = null;
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
      MINIO_ACCESS_KEY: accessKey,
      MINIO_SECRET_KEY: secretKey,
      MINIO_BUCKET: bucket,
    } = parsed.data;
    this._isEnabled = !!(endpoint && accessKey && secretKey && bucket);

    if (this._isEnabled && endpoint && accessKey && secretKey) {
      try {
        const internal = parseEndpoint(endpoint);
        this.client = new MinioClient({
          endPoint: internal.endPoint,
          port: internal.port,
          useSSL: internal.useSSL,
          accessKey,
          secretKey,
        });

        // Presign URLs need the public-facing endpoint so a browser
        // outside the docker network can resolve them.
        if (this.publicEndpoint) {
          const pub = parseEndpoint(this.publicEndpoint);
          this.presignClient = new MinioClient({
            endPoint: pub.endPoint,
            port: pub.port,
            useSSL: pub.useSSL,
            accessKey,
            secretKey,
          });
        } else {
          this.presignClient = this.client;
        }

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

    const metaData: Record<string, string> = {
      'Content-Type': contentType,
      'x-amz-acl': acl,
    };
    // Defense in depth: private objects carry an explicit
    // `Cache-Control: private, max-age=300` so any intermediary CDN /
    // proxy honours the no-sharing semantic even if the presigned URL
    // (the access mechanism for these objects) appears uniform across
    // viewers. Relying solely on URL uniqueness is insufficient —
    // some CDNs normalise query params for cache keys.
    if (acl === 'private') {
      metaData['Cache-Control'] = PRIVATE_CACHE_CONTROL;
    }

    await this.client.putObject(this.bucket, key, file, file.length, metaData);

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
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      this.logger.warn('MinIO delete attempted but service is disabled', 'S3UploadService');
      return false;
    }

    try {
      await this.client.removeObject(this.bucket, key);
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
   * Check if MinIO is enabled
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
   *
   * The presigned URL is signed against `MINIO_PUBLIC_ENDPOINT` when
   * configured so the browser (outside the docker network) can resolve it.
   */
  async uploadAndPresign(opts: {
    key: string;
    body: Buffer;
    contentType: string;
    filename: string;
    ttlSeconds: number;
  }): Promise<{ downloadUrl: string; expiresAt: string }> {
    if (!this._isEnabled || !this.client || !this.bucket || !this.presignClient) {
      throw new StorageConfigurationException();
    }

    // RFC 5987 encoded form sanitises CR/LF and quote injection (P2-#4).
    // The plain `filename=` is kept ASCII-only for legacy clients that
    // can't parse `filename*=`; the encoded form takes precedence in
    // every modern browser.
    const asciiFallback = opts.filename.replace(/[^A-Za-z0-9._-]/g, '_');
    const encoded = encodeURIComponent(opts.filename);
    const contentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
    try {
      await this.client.putObject(this.bucket, opts.key, opts.body, opts.body.length, {
        'Content-Type': opts.contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': PRIVATE_CACHE_CONTROL,
        'x-amz-acl': 'private',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      throw new StorageUploadFailedException(reason);
    }

    const downloadUrl = await this.presignClient.presignedGetObject(
      this.bucket,
      opts.key,
      opts.ttlSeconds,
    );

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + opts.ttlSeconds * 1000).toISOString(),
    };
  }

  /**
   * Check connection to MinIO bucket
   */
  async checkConnection(): Promise<boolean> {
    if (!this._isEnabled || !this.client || !this.bucket) {
      return false;
    }

    try {
      return await this.client.bucketExists(this.bucket);
    } catch (error) {
      this.logger.error('MinIO connection check failed', {
        context: 'S3UploadService',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }
}

function isNotFoundError(err: unknown): boolean {
  if (err instanceof S3Error) {
    return err.code === 'NoSuchKey' || err.code === 'NotFound';
  }
  const code = (err as { code?: string })?.code;
  return code === 'NoSuchKey' || code === 'NotFound';
}
