/**
 * Adapter wrapping the platform `S3UploadService` to satisfy
 * `PostImageStoragePort`. Lets the use case stay unaware of the storage
 * backend.
 */

import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import {
  PostImageStoragePort,
  type PostImageUploadResult,
} from '../../../domain/ports/post-image-storage.port';

export class S3PostImageStorageAdapter extends PostImageStoragePort {
  constructor(private readonly s3: S3UploadService) {
    super();
  }

  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<PostImageUploadResult | null> {
    const result = await this.s3.uploadFile(buffer, key, contentType);
    return result ?? null;
  }
}
