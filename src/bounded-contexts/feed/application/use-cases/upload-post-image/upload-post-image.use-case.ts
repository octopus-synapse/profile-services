/**
 * Upload a post image to blob storage. Validates size + mime type, then
 * generates a deterministic key under `posts/<userId>/<uuid>.<ext>`.
 */

import { randomUUID } from 'node:crypto';
import { FILE_UPLOAD_CONFIG } from '@/shared-kernel';
import {
  FileRequiredException,
  FileTooLargeException,
  FileUploadUnavailableException,
  InvalidFileTypeException,
} from '../../../domain/exceptions/feed.exceptions';
import {
  PostImageStoragePort,
  type PostImageUploadResult,
} from '../../../domain/ports/post-image-storage.port';

export interface UploadPostImageInput {
  readonly userId: string;
  readonly buffer: Buffer;
  readonly originalName: string;
  readonly mimetype: string;
  readonly size: number;
}

export class UploadPostImageUseCase {
  constructor(private readonly storage: PostImageStoragePort) {}

  async execute(input: UploadPostImageInput | null | undefined): Promise<PostImageUploadResult> {
    if (!input?.buffer) {
      throw new FileRequiredException();
    }

    if (input.size > FILE_UPLOAD_CONFIG.MAX_SIZE) {
      throw new FileTooLargeException(FILE_UPLOAD_CONFIG.MAX_SIZE);
    }

    const allowedTypes = FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(input.mimetype as (typeof allowedTypes)[number])) {
      throw new InvalidFileTypeException([...allowedTypes]);
    }

    const extension = input.originalName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const key = `posts/${input.userId}/${randomUUID()}.${extension}`;

    const result = await this.storage.upload(input.buffer, key, input.mimetype);
    if (!result) {
      throw new FileUploadUnavailableException();
    }
    return result;
  }
}
