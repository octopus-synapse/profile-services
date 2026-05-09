/**
 * Validates the incoming image, derives a unique key under the user's
 * profile namespace, and pushes the bytes through the FileStoragePort.
 * A `null` from the port means the storage backend is unreachable —
 * we surface that as `UploadStorageUnavailableException` so the
 * caller can show a "try again" instead of swallowing the failure.
 */

import { randomUUID } from 'node:crypto';
import type { LoggerPort } from '@/shared-kernel';
import { UploadStorageUnavailableException } from '../../../../domain/exceptions';
import {
  FileStoragePort,
  type UploadedFileLocation,
} from '../../../domain/ports/file-storage.port';
import {
  type FileUpload,
  getFileExtension,
  validateFile,
} from '../../../domain/services/file-validator';

const CTX = 'UploadProfileImageUseCase';

export class UploadProfileImageUseCase {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, file: FileUpload): Promise<UploadedFileLocation> {
    validateFile(file);

    const ext = getFileExtension(file.originalname);
    const key = `profiles/${userId}/${randomUUID()}.${ext}`;

    const result = await this.storage.uploadFile(file.buffer, key, file.mimetype);
    if (!result) throw new UploadStorageUnavailableException();

    this.logger.log(`Profile image uploaded user=${userId} key=${key} size=${file.size}`, CTX);
    return result;
  }
}
