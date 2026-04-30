import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { UploadStorageUnavailableException } from '../../../../domain/exceptions/integration.exceptions';
import { InMemoryFileStorage } from '../../../testing';
import { UploadProfileImageUseCase } from './upload-profile-image.use-case';

const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

describe('UploadProfileImageUseCase', () => {
  let storage: InMemoryFileStorage;
  let useCase: UploadProfileImageUseCase;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    useCase = new UploadProfileImageUseCase(storage, stubLogger);
  });

  it('stores the file under the user-scoped profile namespace', async () => {
    const result = await useCase.execute('user-1', {
      buffer: validJpeg,
      originalname: 'me.jpg',
      mimetype: 'image/jpeg',
      size: validJpeg.length,
    });

    expect(result.key).toMatch(/^profiles\/user-1\/[a-f0-9-]+\.jpg$/);
    expect(storage.stored.has(result.key)).toBe(true);
  });

  it('translates a null storage response into UploadStorageUnavailableException', async () => {
    storage.failNextUploadAsUnavailable();

    await expect(
      useCase.execute('user-1', {
        buffer: validJpeg,
        originalname: 'me.jpg',
        mimetype: 'image/jpeg',
        size: validJpeg.length,
      }),
    ).rejects.toBeInstanceOf(UploadStorageUnavailableException);
  });
});
