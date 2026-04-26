import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { FILE_UPLOAD_CONFIG } from '@/shared-kernel';
import {
  UploadContentInvalidException,
  UploadExtensionMismatchException,
  UploadFilenameUnsafeException,
  UploadFileTooLargeException,
  UploadInvalidFileTypeException,
  UploadStorageUnavailableException,
} from '../domain/exceptions/integration.exceptions';

export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadService {
  private readonly allowedMimeTypes = FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES;
  private readonly maxFileSize = FILE_UPLOAD_CONFIG.MAX_SIZE;

  constructor(
    private readonly s3Service: S3UploadService,
    private readonly logger: AppLoggerService,
  ) {}

  async uploadProfileImage(userId: string, file: FileUpload) {
    this.validateFile(file);

    const extension = this.getFileExtension(file.originalname);
    const key = `profiles/${userId}/${randomUUID()}.${extension}`;

    const result = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);

    if (!result) {
      throw new UploadStorageUnavailableException();
    }

    this.logger.log('Profile image uploaded', 'UploadService', { userId, key, size: file.size });

    return result;
  }

  async uploadCompanyLogo(userId: string, resumeId: string, file: FileUpload) {
    this.validateFile(file);

    const extension = this.getFileExtension(file.originalname);
    const key = `logos/${userId}/${resumeId}/${randomUUID()}.${extension}`;

    const result = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);

    if (!result) {
      throw new UploadStorageUnavailableException();
    }

    this.logger.log('Company logo uploaded', 'UploadService', {
      userId,
      resumeId,
      key,
      size: file.size,
    });

    return result;
  }

  async deleteFile(key: string) {
    const result = await this.s3Service.deleteFile(key);

    if (result) {
      this.logger.log('File deleted', 'UploadService', { key });
    }

    return result;
  }

  private validateFile(file: FileUpload) {
    if (file.size > this.maxFileSize) {
      throw new UploadFileTooLargeException(this.maxFileSize);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype as (typeof this.allowedMimeTypes)[number])) {
      throw new UploadInvalidFileTypeException([...this.allowedMimeTypes]);
    }

    this.validateFilenameSafety(file.originalname);
    this.validateExtensionMatch(file);
    this.validateMagicBytes(file);
  }

  private validateFilenameSafety(filename: string) {
    if (filename.includes('\0')) {
      throw new UploadFilenameUnsafeException('null_bytes');
    }

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new UploadFilenameUnsafeException('directory_traversal');
    }
  }

  private validateExtensionMatch(file: FileUpload) {
    const ext = this.getFileExtension(file.originalname);

    const mimeToExt: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'image/gif': ['gif'],
    };

    const allowedExts = mimeToExt[file.mimetype] ?? [];
    if (!allowedExts.includes(ext)) {
      throw new UploadExtensionMismatchException(ext, file.mimetype);
    }
  }

  private validateMagicBytes(file: FileUpload) {
    if (file.buffer.length < 4) {
      throw new UploadContentInvalidException('too_small');
    }

    const header = file.buffer.toString('hex', 0, 12).toUpperCase();

    if (file.mimetype === 'image/jpeg' && !header.startsWith('FFD8FF')) {
      throw new UploadContentInvalidException('bad_magic_jpeg');
    }
    if (file.mimetype === 'image/png' && !header.startsWith('89504E47')) {
      throw new UploadContentInvalidException('bad_magic_png');
    }
    if (file.mimetype === 'image/webp') {
      if (!header.startsWith('52494646')) {
        throw new UploadContentInvalidException('bad_magic_webp');
      }
      const webpType = file.buffer.toString('hex', 8, 12).toUpperCase();
      if (webpType !== '57454250') {
        throw new UploadContentInvalidException('bad_magic_webp');
      }
    }
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts[parts.length - 1].toLowerCase();
  }
}
