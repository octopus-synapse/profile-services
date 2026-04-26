import { beforeEach, describe, expect, it } from 'bun:test';
import type { EventPublisher } from '@/shared-kernel';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
  type UserFitProfileWrite,
} from '../../domain/ports/user-fit-profile.repository.port';
import { ExpireFitProfileUseCase } from './expire-fit-profile.use-case';

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

class StubProfiles extends UserFitProfileRepositoryPort {
  public row: SavedUserFitProfile | null = null;
  async findByUserId(userId: string) {
    return this.row && this.row.userId === userId ? this.row : null;
  }
  async upsert(_input: UserFitProfileWrite): Promise<SavedUserFitProfile> {
    throw new Error('not used');
  }
  async anonymize(_userId: string) {}
}

describe('ExpireFitProfileUseCase', () => {
  let profiles: StubProfiles;
  let useCase: ExpireFitProfileUseCase;

  beforeEach(() => {
    profiles = new StubProfiles();
    useCase = new ExpireFitProfileUseCase(profiles, stubEventPublisher, stubLogger);
  });

  it('reports not expired when there is no row', async () => {
    const result = await useCase.execute('u-1');
    expect(result).toEqual({ expired: false, profile: null });
  });

  it('reports not expired when the vector has been anonymised', async () => {
    profiles.row = {
      id: 'p-1',
      userId: 'u-1',
      vector: null,
      version: 1,
      computedAt: new Date('2024-01-01'),
      expiresAt: new Date('2024-04-01'),
    };
    const result = await useCase.execute('u-1');
    expect(result.expired).toBe(false);
  });

  it('reports expired when now > expiresAt', async () => {
    profiles.row = {
      id: 'p-1',
      userId: 'u-1',
      vector: { bigFive: { BIG_FIVE_OPENNESS: 0.5 }, schwartz: {}, sdt: {} },
      version: 1,
      computedAt: new Date('2024-01-01'),
      expiresAt: new Date('2024-04-01'),
    };
    const result = await useCase.execute('u-1', new Date('2026-04-23'));
    expect(result.expired).toBe(true);
  });

  it('reports not expired when now <= expiresAt', async () => {
    profiles.row = {
      id: 'p-1',
      userId: 'u-1',
      vector: { bigFive: { BIG_FIVE_OPENNESS: 0.5 }, schwartz: {}, sdt: {} },
      version: 1,
      computedAt: new Date('2026-04-01'),
      expiresAt: new Date('2026-07-01'),
    };
    const result = await useCase.execute('u-1', new Date('2026-04-23'));
    expect(result.expired).toBe(false);
  });
});
