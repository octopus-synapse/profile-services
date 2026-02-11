import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { ERROR_MESSAGES, FILE_UPLOAD_CONFIG } from '@/shared-kernel';

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
    const key = `profiles/${userId}/${uuidv4()}.${extension}`;

    const result = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);

    if (!result) {
      throw new BadRequestException(ERROR_MESSAGES.FILE_UPLOAD_UNAVAILABLE);
    }

    this.logger.log('Profile image uploaded', 'UploadService', {
      userId,
      key,
      size: file.size,
    });

    return result;
  }

  async uploadCompanyLogo(userId: string, resumeId: string, file: FileUpload) {
    this.validateFile(file);

    const extension = this.getFileExtension(file.originalname);
    const key = `logos/${userId}/${resumeId}/${uuidv4()}.${extension}`;

    const result = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);

    if (!result) {
      throw new BadRequestException(ERROR_MESSAGES.FILE_UPLOAD_UNAVAILABLE);
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
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype as (typeof this.allowedMimeTypes)[number])) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Security Validations
    this.validateFilenameSafety(file.originalname);
    this.validateExtensionMatch(file);
    this.validateMagicBytes(file);
  }

  private validateFilenameSafety(filename: string) {
    if (filename.includes('\0')) {
      throw new BadRequestException('Invalid filename: contains null bytes');
    }

    // Check for directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename: directory traversal detected');
    }
  }

  private validateExtensionMatch(file: FileUpload) {
    const ext = this.getFileExtension(file.originalname);

    // Map mime to allowed extensions
    const mimeToExt: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'image/gif': ['gif'],
    };

    const allowedExts = mimeToExt[file.mimetype] ?? [];
    if (!allowedExts.includes(ext)) {
      throw new BadRequestException(
        `File extension .${ext} does not match file type ${file.mimetype}`,
      );
    }
  }

  private validateMagicBytes(file: FileUpload) {
    if (file.buffer.length < 4) {
      throw new BadRequestException('Invalid file content');
    }

    const header = file.buffer.toString('hex', 0, 12).toUpperCase();

    // JPEG: FFD8FF
    if (file.mimetype === 'image/jpeg' && !header.startsWith('FFD8FF')) {
      throw new BadRequestException('Invalid JPEG file content');
    }
    // PNG: 89504E47
    if (file.mimetype === 'image/png' && !header.startsWith('89504E47')) {
      throw new BadRequestException('Invalid PNG file content');
    }
    // WEBP: RIFF....WEBP (52494646....57454250)
    if (file.mimetype === 'image/webp') {
      if (!header.startsWith('52494646')) {
        // RIFF
        throw new BadRequestException('Invalid WEBP file content');
      }
      // Check bytes 8-11 for WEBP
      const webpType = file.buffer.toString('hex', 8, 12).toUpperCase();
      if (webpType !== '57454250') {
        throw new BadRequestException('Invalid WEBP file content');
      }
    }
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts[parts.length - 1].toLowerCase();
  }

  isServiceAvailable(): boolean {
    return this.s3Service.isEnabled;
  }
}
