/**
 * Hardening tests for the upload validator. The legacy
 * `UploadService.security.spec.ts` lived a level up and pulled the
 * whole Nest TestingModule to assert the same six rules; with the
 * validator now a pure function it can be exercised directly.
 *
 * Coverage matches the historical bug list:
 *   - BUG-024: SVG (and any non-allowlisted MIME) is rejected.
 *   - BUG-025: magic-byte check rejects spoofed MIME types.
 *   - BUG-026: filename safety + extension/mime match defeat double-
 *              extension and null-byte attacks.
 */

import { describe, expect, it } from 'bun:test';
import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';
import { type FileUpload, validateFile } from './file-validator';

const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00]);

const baseFile: FileUpload = {
  buffer: validJpegHeader,
  originalname: 'photo.jpg',
  mimetype: 'image/jpeg',
  size: 1024,
};

describe('validateFile (upload domain)', () => {
  it('accepts a well-formed JPEG', () => {
    expect(() => validateFile(baseFile)).not.toThrow();
  });

  it('rejects SVG (not in the image allowlist) — BUG-024', () => {
    expect(() =>
      validateFile({
        buffer: Buffer.from('<svg><script>alert("xss")</script></svg>'),
        originalname: 'malicious.svg',
        mimetype: 'image/svg+xml',
        size: 100,
      }),
    ).toThrow(ValidationException);
  });

  it('rejects spoofed MIME without matching magic bytes — BUG-025', () => {
    expect(() =>
      validateFile({
        buffer: Buffer.from('<?php echo "hacked"; ?>'),
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
        size: 100,
      }),
    ).toThrow(ValidationException);
  });

  it('rejects PNG with the wrong magic bytes', () => {
    expect(() =>
      validateFile({
        buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]),
        originalname: 'fake.png',
        mimetype: 'image/png',
        size: 100,
      }),
    ).toThrow(ValidationException);
  });

  it('rejects double-extension filenames (image.jpg.php) — BUG-026', () => {
    expect(() =>
      validateFile({
        ...baseFile,
        originalname: 'image.jpg.php',
      }),
    ).toThrow(ValidationException);
  });

  it('rejects null-byte filenames — BUG-026', () => {
    expect(() =>
      validateFile({
        ...baseFile,
        originalname: 'image.php\x00.jpg',
      }),
    ).toThrow(ValidationException);
  });

  it('rejects directory traversal in the filename', () => {
    expect(() =>
      validateFile({
        ...baseFile,
        originalname: '../../../etc/passwd.jpg',
      }),
    ).toThrow(ValidationException);
  });

  it('rejects files smaller than the magic-byte window', () => {
    expect(() =>
      validateFile({
        ...baseFile,
        buffer: Buffer.from([0xff]),
      }),
    ).toThrow(ValidationException);
  });
});
