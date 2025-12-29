import { Injectable, BadRequestException } from '@nestjs/common';
import { S3UploadService } from '../common/services/s3-upload.service';
import { AppLoggerService } from '../common/logger/logger.service';
import { APP_CONSTANTS } from '../common/constants/app.constants';
import { v4 as uuidv4 } from 'uuid';

export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadService {
  private readonly allowedMimeTypes = APP_CONSTANTS.ALLOWED_IMAGE_TYPES;
  private readonly maxFileSize = APP_CONSTANTS.MAX_FILE_SIZE;

  constructor(
    private readonly s3Service: S3UploadService,
    private readonly logger: AppLoggerService,
  ) {}

  async uploadProfileImage(userId: string, file: FileUpload) {
    this.validateFile(file);

    const extension = this.getFileExtension(file.originalname);
    const key = `profiles/${userId}/${uuidv4()}.${extension}`;

    const result = await this.s3Service.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    if (!result) {
      throw new BadRequestException('File upload service unavailable');
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

    const result = await this.s3Service.uploadFile(
      file.buffer,
      key,
      file.mimetype,
    );

    if (!result) {
      throw new BadRequestException('File upload service unavailable');
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

    if (
      !this.allowedMimeTypes.includes(
        file.mimetype as (typeof this.allowedMimeTypes)[number],
      )
    ) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
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
