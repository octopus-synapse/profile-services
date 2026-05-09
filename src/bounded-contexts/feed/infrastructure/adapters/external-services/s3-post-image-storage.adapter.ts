/**
 * Adapter wrapping the platform `S3UploadService` to satisfy
 * `PostImageStoragePort`. Lets the use case stay unaware of the storage
 * backend.
 *
 * P0-015: post images are uploaded **private** — feed posts can carry
 * connection-only or otherwise restricted content, and a public URL
 * would leak it through CDN caches even after the post is taken down.
 * The accompanying read path serves images through presigned GET URLs
 * with `Cache-Control: private, max-age=300` so a CDN can't share the
 * response across users.
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
    const result = await this.s3.uploadFile(buffer, key, contentType, { acl: 'private' });
    return result ?? null;
  }
}
