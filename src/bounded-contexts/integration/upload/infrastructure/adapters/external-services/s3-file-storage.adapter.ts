/**
 * Adapts the platform-wide `S3UploadService` to the upload BC's
 * `FileStoragePort`. The service has way more surface than this BC
 * needs (download, presign, etc.); this adapter narrows it down to
 * just upload + delete.
 *
 * The platform service silently returns `null` when MinIO/S3 env vars
 * aren't set; we keep the `null` channel for backwards-compat callers
 * that treat it as "best-effort", but `uploadFileOrThrow` surfaces a
 * crisp `IntegrationNotConfiguredException` for callers that want a
 * 503 instead.
 */

import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { IntegrationNotConfiguredException } from '../../../../domain/exceptions';
import {
  FileStoragePort,
  type UploadedFileLocation,
} from '../../../domain/ports/file-storage.port';

const PROVIDER = 'S3/MinIO';

export class S3FileStorageAdapter extends FileStoragePort {
  constructor(private readonly s3: S3UploadService) {
    super();
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadedFileLocation | null> {
    return this.s3.uploadFile(file, key, contentType);
  }

  async uploadFileOrThrow(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadedFileLocation> {
    const result = await this.s3.uploadFile(file, key, contentType);
    if (!result) throw new IntegrationNotConfiguredException(PROVIDER);
    return result;
  }

  async deleteFile(key: string): Promise<boolean> {
    return this.s3.deleteFile(key);
  }
}
