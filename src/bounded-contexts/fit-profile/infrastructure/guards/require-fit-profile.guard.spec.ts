import { describe, expect, it } from 'bun:test';
import { ConflictException, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import {
  type SavedUserFitProfile,
  UserFitProfileRepositoryPort,
  type UserFitProfileWrite,
} from '../../domain/ports/user-fit-profile.repository.port';
import { RequireFitProfileGuard } from './require-fit-profile.guard';

class FakeRepo extends UserFitProfileRepositoryPort {
  constructor(private readonly seed: SavedUserFitProfile | null) {
    super();
  }
  async findByUserId(): Promise<SavedUserFitProfile | null> {
    return this.seed;
  }
  async upsert(_input: UserFitProfileWrite): Promise<SavedUserFitProfile> {
    throw new Error('not used');
  }
  async anonymize(): Promise<void> {}
}

function ctx(
  user: Partial<{ userId: string; id: string; roles: string[] }> | null,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: user ?? undefined }),
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    getClass: () => Object,
    getHandler: () => () => undefined,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}) as never,
    switchToWs: () => ({}) as never,
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

const validProfile: SavedUserFitProfile = {
  id: 'p1',
  userId: 'u1',
  vector: { bigFive: {}, schwartz: {}, sdt: {} },
  version: 1,
  computedAt: new Date(),
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
};

describe('RequireFitProfileGuard', () => {
  it('throws Unauthorized when there is no authenticated user', async () => {
    const guard = new RequireFitProfileGuard(new FakeRepo(null));
    await expect(guard.canActivate(ctx(null))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('bypasses non-standard users (admins / recruiters)', async () => {
    const guard = new RequireFitProfileGuard(new FakeRepo(null));
    await expect(
      guard.canActivate(ctx({ userId: 'u1', roles: ['role_user', 'role_admin'] })),
    ).resolves.toBe(true);
  });

  it('blocks standard users without any fit profile (409)', async () => {
    const guard = new RequireFitProfileGuard(new FakeRepo(null));
    await expect(
      guard.canActivate(ctx({ userId: 'u1', roles: ['role_user', 'role_user_standard'] })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks standard users whose profile has been anonymized (vector null)', async () => {
    const guard = new RequireFitProfileGuard(new FakeRepo({ ...validProfile, vector: null }));
    await expect(
      guard.canActivate(ctx({ userId: 'u1', roles: ['role_user_standard'] })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks standard users whose profile has expired', async () => {
    const guard = new RequireFitProfileGuard(
      new FakeRepo({ ...validProfile, expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(
      guard.canActivate(ctx({ userId: 'u1', roles: ['role_user_standard'] })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets a standard user through when the profile is valid and unexpired', async () => {
    const guard = new RequireFitProfileGuard(new FakeRepo(validProfile));
    await expect(
      guard.canActivate(ctx({ userId: 'u1', roles: ['role_user_standard'] })),
    ).resolves.toBe(true);
  });
});
