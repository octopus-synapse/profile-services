/**
 * Same shape as the profile-image upload, but the key is namespaced
 * by both userId and resumeId so logos are scoped to a single resume
 * (different resumes can hold their own copy without colliding).
 */

import { randomUUID } from 'node:crypto';
import type { LoggerPort } from '@/shared-kernel';
import { UploadStorageUnavailableException } from '../../../../domain/exceptions/integration.exceptions';
import { FileStoragePort, type UploadedFileLocation } from '../../../domain/ports/file-storage.port';
import { type FileUpload, getFileExtension, validateFile } from '../../../domain/services/file-validator';

const CTX = 'UploadCompanyLogoUseCase';

export class UploadCompanyLogoUseCase {
  constructor(
    private readonly storage: FileStoragePort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, resumeId: string, file: FileUpload): Promise<UploadedFileLocation> {
    validateFile(file);

    const ext = getFileExtension(file.originalname);
    const key = `logos/${userId}/${resumeId}/${randomUUID()}.${ext}`;

    const result = await this.storage.uploadFile(file.buffer, key, file.mimetype);
    if (!result) throw new UploadStorageUnavailableException();

    this.logger.log(
      `Company logo uploaded user=${userId} resume=${resumeId} key=${key} size=${file.size}`,
      CTX,
    );
    return result;
  }
}
