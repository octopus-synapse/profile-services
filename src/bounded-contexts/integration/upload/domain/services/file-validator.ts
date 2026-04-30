/**
 * Domain validator for uploaded image files. Pure function — no
 * dependencies, no I/O, no logging — so it lives in the domain
 * layer and is reusable from any use case.
 *
 * The five gates (size → mime allowlist → filename safety → extension
 * matches mime → magic bytes match the claimed type) line up with the
 * security tests; growing this validator means the matching gate goes
 * here, not in the use case.
 */

import { FILE_UPLOAD_CONFIG } from '@/shared-kernel';
import {
  UploadContentInvalidException,
  UploadExtensionMismatchException,
  UploadFilenameUnsafeException,
  UploadFileTooLargeException,
  UploadInvalidFileTypeException,
} from '../../../domain/exceptions/integration.exceptions';

export interface FileUpload {
  readonly buffer: Buffer;
  readonly originalname: string;
  readonly mimetype: string;
  readonly size: number;
}

const ALLOWED_MIME_TYPES = FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES;
const MAX_FILE_SIZE = FILE_UPLOAD_CONFIG.MAX_SIZE;

const MIME_TO_EXT: Record<string, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
};

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return (parts[parts.length - 1] ?? '').toLowerCase();
}

export function validateFile(file: FileUpload): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadFileTooLargeException(MAX_FILE_SIZE);
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new UploadInvalidFileTypeException([...ALLOWED_MIME_TYPES]);
  }
  validateFilenameSafety(file.originalname);
  validateExtensionMatch(file);
  validateMagicBytes(file);
}

function validateFilenameSafety(filename: string): void {
  if (filename.includes('\0')) {
    throw new UploadFilenameUnsafeException('null_bytes');
  }
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new UploadFilenameUnsafeException('directory_traversal');
  }
}

function validateExtensionMatch(file: FileUpload): void {
  const ext = getFileExtension(file.originalname);
  const allowedExts = MIME_TO_EXT[file.mimetype] ?? [];
  if (!allowedExts.includes(ext)) {
    throw new UploadExtensionMismatchException(ext, file.mimetype);
  }
}

function validateMagicBytes(file: FileUpload): void {
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
