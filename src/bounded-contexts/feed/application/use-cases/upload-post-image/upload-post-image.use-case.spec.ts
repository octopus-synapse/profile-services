import { describe, expect, it } from 'bun:test';
import {
  FileRequiredException,
  FileTooLargeException,
  FileUploadUnavailableException,
  InvalidFileTypeException,
} from '../../../domain/exceptions/feed.exceptions';
import { InMemoryPostImageStorage } from '../../../testing';
import { UploadPostImageUseCase } from './upload-post-image.use-case';

function make() {
  const storage = new InMemoryPostImageStorage();
  return { storage, useCase: new UploadPostImageUseCase(storage) };
}

/** P1-059 — magic-byte prefix for a valid PNG. Tests pass this as
 *  `buffer` so the magic-bytes guard inside the use case accepts the
 *  upload. The body is a single byte after the signature; storage
 *  fakes don't care about content. */
const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);

describe('UploadPostImageUseCase', () => {
  it('throws FileRequiredException when no input', async () => {
    const { useCase } = make();
    await expect(useCase.execute(undefined)).rejects.toThrow(FileRequiredException);
  });

  it('throws FileTooLargeException for oversized', async () => {
    const { useCase } = make();
    await expect(
      useCase.execute({
        userId: 'u',
        buffer: Buffer.from('x'),
        originalName: 'x.png',
        mimetype: 'image/png',
        size: 999_999_999,
      }),
    ).rejects.toThrow(FileTooLargeException);
  });

  it('throws InvalidFileTypeException for non-image', async () => {
    const { useCase } = make();
    await expect(
      useCase.execute({
        userId: 'u',
        buffer: Buffer.from('x'),
        originalName: 'x.exe',
        mimetype: 'application/octet-stream',
        size: 100,
      }),
    ).rejects.toThrow(InvalidFileTypeException);
  });

  it('throws FileUploadUnavailableException when storage returns null', async () => {
    const { storage, useCase } = make();
    storage.failNext();
    await expect(
      useCase.execute({
        userId: 'u',
        buffer: PNG_BUFFER,
        originalName: 'x.png',
        mimetype: 'image/png',
        size: PNG_BUFFER.length,
      }),
    ).rejects.toThrow(FileUploadUnavailableException);
  });

  it('returns url+key on success with computed key prefix', async () => {
    const { useCase } = make();
    const out = await useCase.execute({
      userId: 'user-1',
      buffer: PNG_BUFFER,
      originalName: 'photo.PNG',
      mimetype: 'image/png',
      size: PNG_BUFFER.length,
    });
    expect(out.key.startsWith('posts/user-1/')).toBe(true);
    expect(out.key.endsWith('.png')).toBe(true);
  });

  it('rejects when declared mime does not match buffer signature (P1-059)', async () => {
    const { useCase } = make();
    // Declared as PNG, but the buffer prefix is JPEG — magic-byte
    // guard catches the spoof.
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    await expect(
      useCase.execute({
        userId: 'user-1',
        buffer: jpegBuffer,
        originalName: 'photo.png',
        mimetype: 'image/png',
        size: jpegBuffer.length,
      }),
    ).rejects.toThrow(InvalidFileTypeException);
  });
});
