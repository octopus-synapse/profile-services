import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryFileStorage } from '../../../testing';
import { DeleteUploadUseCase } from './delete-upload.use-case';

describe('DeleteUploadUseCase', () => {
  let storage: InMemoryFileStorage;
  let useCase: DeleteUploadUseCase;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    useCase = new DeleteUploadUseCase(storage, stubLogger);
  });

  it('returns true when the storage actually removed the key', async () => {
    storage.stored.set('profiles/u/me.jpg', { buffer: Buffer.alloc(4), contentType: 'image/jpeg' });

    const ok = await useCase.execute('profiles/u/me.jpg');

    expect(ok).toBe(true);
    expect(storage.deleted).toEqual(['profiles/u/me.jpg']);
  });

  it('returns false when the key does not exist', async () => {
    const ok = await useCase.execute('missing-key');
    expect(ok).toBe(false);
  });
});
