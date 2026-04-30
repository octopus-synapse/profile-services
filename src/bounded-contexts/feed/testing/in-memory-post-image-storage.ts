/**
 * In-memory `PostImageStoragePort` for use-case specs.
 */

import {
  PostImageStoragePort,
  type PostImageUploadResult,
} from '../domain/ports/post-image-storage.port';

export class InMemoryPostImageStorage extends PostImageStoragePort {
  readonly uploads: { key: string; size: number; contentType: string }[] = [];
  private nextFails = false;

  failNext(): void {
    this.nextFails = true;
  }

  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<PostImageUploadResult | null> {
    if (this.nextFails) {
      this.nextFails = false;
      return null;
    }
    this.uploads.push({ key, size: buffer.length, contentType });
    return { url: `https://test.example.com/${key}`, key };
  }
}
