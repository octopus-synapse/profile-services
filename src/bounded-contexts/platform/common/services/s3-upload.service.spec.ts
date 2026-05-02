/**
 * S3UploadService Tests
 *
 * Focused on the strict-throw variants — the lenient `uploadFile` /
 * `downloadFile` returns `null` for back-compat, but `*Strict` paths
 * surface typed `STORAGE_*` exceptions so the envelope carries a stable
 * code instead of a generic 500.
 */

import { describe, expect, it, mock } from 'bun:test';
import type { ConfigPort } from '@/shared-kernel/config';
import type { LoggerPort } from '@/shared-kernel/logger';
import {
  StorageConfigurationException,
  StorageObjectNotFoundException,
  StorageUploadFailedException,
} from '../exceptions/platform.exceptions';
import { S3UploadService } from './s3-upload.service';

const buildLogger = (): LoggerPort =>
  ({
    log: mock(),
    debug: mock(),
    warn: mock(),
    error: mock(),
    setContext: mock(),
  }) as unknown as LoggerPort;

const disabledConfig = (): ConfigPort =>
  ({
    get: mock(() => undefined),
    getOrDefault: mock((_k: string, d: unknown) => d),
  }) as unknown as ConfigPort;

describe('S3UploadService — strict throws', () => {
  it('throws StorageConfigurationException when uploadFileStrict runs disabled', async () => {
    const service = new S3UploadService(disabledConfig(), buildLogger());

    await expect(service.uploadFileStrict(Buffer.from('x'), 'k.png', 'image/png')).rejects.toThrow(
      StorageConfigurationException,
    );
  });

  it('throws StorageConfigurationException when downloadFileStrict runs disabled', async () => {
    const service = new S3UploadService(disabledConfig(), buildLogger());

    await expect(service.downloadFileStrict('k.png')).rejects.toThrow(
      StorageConfigurationException,
    );
  });

  it('throws StorageObjectNotFoundException when downloadFileStrict misses', async () => {
    const service = new S3UploadService(disabledConfig(), buildLogger());
    // Force enable the client surface — bypass the disabled check by
    // overriding the underlying lenient getter.
    (service as unknown as { _isEnabled: boolean })._isEnabled = true;
    (service as unknown as { client: unknown }).client = {};
    (service as unknown as { bucket: string }).bucket = 'test';
    service.downloadFile = mock(() => Promise.resolve(null));

    await expect(service.downloadFileStrict('k.png')).rejects.toThrow(
      StorageObjectNotFoundException,
    );
  });

  it('throws StorageUploadFailedException when uploadFile returns null on enabled service', async () => {
    const service = new S3UploadService(disabledConfig(), buildLogger());
    (service as unknown as { _isEnabled: boolean })._isEnabled = true;
    (service as unknown as { client: unknown }).client = {};
    (service as unknown as { bucket: string }).bucket = 'test';
    service.uploadFile = mock(() => Promise.resolve(null));

    await expect(service.uploadFileStrict(Buffer.from('x'), 'k.png', 'image/png')).rejects.toThrow(
      StorageUploadFailedException,
    );
  });
});
