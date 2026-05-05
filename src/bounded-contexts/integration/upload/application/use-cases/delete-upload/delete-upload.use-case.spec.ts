import { beforeEach, describe, expect, it } from 'bun:test';
import { OwnershipAccessDeniedException } from '@/shared-kernel/authorization';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryFileStorage } from '../../../testing';
import { UploadOwnershipPort } from '../../ports/upload-ownership.port';
import { DeleteUploadUseCase, inferOwnerFromKeyPath } from './delete-upload.use-case';

class InMemoryOwnership extends UploadOwnershipPort {
  readonly rows = new Map<string, string>();
  async findOwner(key: string): Promise<string | null> {
    return this.rows.get(key) ?? null;
  }
  async record(record: { key: string; userId: string }): Promise<void> {
    this.rows.set(record.key, record.userId);
  }
  async recordIfMissing(record: { key: string; userId: string }): Promise<void> {
    if (!this.rows.has(record.key)) this.rows.set(record.key, record.userId);
  }
}

describe('DeleteUploadUseCase', () => {
  // Long enough to look like an opaque id under the path heuristic.
  const USER_A = '11111111-1111-1111-1111-111111111111';
  const USER_B = '22222222-2222-2222-2222-222222222222';
  let storage: InMemoryFileStorage;
  let ownership: InMemoryOwnership;
  let useCase: DeleteUploadUseCase;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    ownership = new InMemoryOwnership();
    useCase = new DeleteUploadUseCase(storage, ownership, stubLogger);
  });

  it('deletes when caller owns the recorded upload', async () => {
    const key = `profiles/${USER_A}/me.jpg`;
    storage.stored.set(key, { buffer: Buffer.alloc(4), contentType: 'image/jpeg' });
    ownership.rows.set(key, USER_A);

    const ok = await useCase.execute(key, USER_A);

    expect(ok).toBe(true);
    expect(storage.deleted).toEqual([key]);
  });

  it('refuses when recorded owner is a different user', async () => {
    const key = `profiles/${USER_A}/me.jpg`;
    storage.stored.set(key, { buffer: Buffer.alloc(4), contentType: 'image/jpeg' });
    ownership.rows.set(key, USER_A);

    await expect(useCase.execute(key, USER_B)).rejects.toBeInstanceOf(
      OwnershipAccessDeniedException,
    );
    expect(storage.deleted).toEqual([]);
  });

  it('lazy-backfills when no row exists and path matches caller', async () => {
    const key = `profiles/${USER_A}/me.jpg`;
    storage.stored.set(key, { buffer: Buffer.alloc(4), contentType: 'image/jpeg' });

    const ok = await useCase.execute(key, USER_A);

    expect(ok).toBe(true);
    expect(ownership.rows.get(key)).toBe(USER_A);
  });

  it('refuses lazy backfill when path does not match caller', async () => {
    const key = `profiles/${USER_A}/me.jpg`;
    storage.stored.set(key, { buffer: Buffer.alloc(4), contentType: 'image/jpeg' });

    await expect(useCase.execute(key, USER_B)).rejects.toBeInstanceOf(
      OwnershipAccessDeniedException,
    );
    expect(ownership.rows.size).toBe(0);
  });
});

describe('inferOwnerFromKeyPath', () => {
  it('extracts userId from `<prefix>/<userId>/<file>`', () => {
    const id = '11111111-1111-1111-1111-111111111111';
    expect(inferOwnerFromKeyPath(`profiles/${id}/me.jpg`)).toBe(id);
  });

  it('returns null when the key has no id-shaped segment', () => {
    expect(inferOwnerFromKeyPath('profiles/static/banner.jpg')).toBeNull();
    expect(inferOwnerFromKeyPath('flat-key')).toBeNull();
  });
});
