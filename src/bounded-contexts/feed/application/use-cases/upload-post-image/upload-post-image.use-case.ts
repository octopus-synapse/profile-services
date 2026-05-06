/**
 * Upload a post image to blob storage. Validates size + mime type +
 * magic bytes, then generates a deterministic key under
 * `posts/<userId>/<uuid>.<ext>`.
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

/**
 * P1-059 — magic-byte signatures for the image formats we accept.
 * Map each allowed mime type to one or more byte prefixes. The
 * declared mime is checked against the buffer's actual prefix; a
 * mismatch rejects the upload before it reaches storage.
 *
 * We don't pull in `file-type` to keep the bundle lean — these four
 * formats cover the full allowlist and the signatures are stable
 * (defined in each format's spec, not heuristic).
 */
const MAGIC_BYTES: Readonly<Record<string, ReadonlyArray<readonly number[]>>> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  // WebP: "RIFF????WEBP" — bytes 0..3 are RIFF, 8..11 are WEBP.
  // We check both windows in `matchesMagic`.
  'image/webp': [],
};

function matchesMagic(buffer: Buffer, mimetype: string): boolean {
  if (mimetype === 'image/webp') {
    if (buffer.length < 12) return false;
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }
  const sigs = MAGIC_BYTES[mimetype];
  if (!sigs) return false;
  return sigs.some((sig) => sig.every((b, i) => buffer[i] === b));
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

    // P1-059 — verify the actual buffer prefix matches the declared
    // mime. An attacker setting `mimetype: image/png` on a buffer
    // that's actually an executable would have passed the previous
    // (mime-only) check; this catches the spoof.
    if (!matchesMagic(input.buffer, input.mimetype)) {
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
