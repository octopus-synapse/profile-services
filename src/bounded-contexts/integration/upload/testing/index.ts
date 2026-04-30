/**
 * In-memory test double for `FileStoragePort`. Records every upload
 * by key so specs can assert key shape without touching MinIO. The
 * `failNextUpload` switch lets a test exercise the
 * "storage unavailable" branch without monkey-patching anything.
 */

import { FileStoragePort, type UploadedFileLocation } from '../domain/ports/file-storage.port';

export class InMemoryFileStorage extends FileStoragePort {
  readonly stored = new Map<string, { buffer: Buffer; contentType: string }>();
  readonly deleted: string[] = [];
  private nextUploadReturnsNull = false;

  failNextUploadAsUnavailable(): void {
    this.nextUploadReturnsNull = true;
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType: string,
  ): Promise<UploadedFileLocation | null> {
    if (this.nextUploadReturnsNull) {
      this.nextUploadReturnsNull = false;
      return null;
    }
    this.stored.set(key, { buffer: file, contentType });
    return { url: `mem://${key}`, key };
  }

  async deleteFile(key: string): Promise<boolean> {
    this.deleted.push(key);
    return this.stored.delete(key);
  }
}
