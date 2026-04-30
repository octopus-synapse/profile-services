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
        buffer: Buffer.from('x'),
        originalName: 'x.png',
        mimetype: 'image/png',
        size: 100,
      }),
    ).rejects.toThrow(FileUploadUnavailableException);
  });

  it('returns url+key on success with computed key prefix', async () => {
    const { useCase } = make();
    const out = await useCase.execute({
      userId: 'user-1',
      buffer: Buffer.from('x'),
      originalName: 'photo.PNG',
      mimetype: 'image/png',
      size: 10,
    });
    expect(out.key.startsWith('posts/user-1/')).toBe(true);
    expect(out.key.endsWith('.png')).toBe(true);
  });
});
