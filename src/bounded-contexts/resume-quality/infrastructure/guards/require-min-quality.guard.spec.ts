import { describe, expect, it } from 'bun:test';
import { ConflictException, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GetLatestQualityUseCase } from '../../application/use-cases/get-latest-quality.use-case';
import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../domain/ports/quality-score.repository.port';
import type { QualityBreakdown } from '../../domain/types';
import { RequireMinQualityGuard } from './require-min-quality.guard';

class FakeRepo extends QualityScoreRepositoryPort {
  constructor(private readonly snapshot: SavedQualityScore | null) {
    super();
  }
  async save(_resumeId: string, _b: QualityBreakdown): Promise<SavedQualityScore> {
    throw new Error('not used');
  }
  async findLatest(): Promise<SavedQualityScore | null> {
    return this.snapshot;
  }
  async findHistory(): Promise<readonly SavedQualityScore[]> {
    return this.snapshot ? [this.snapshot] : [];
  }
}

class FakePrisma {
  constructor(private readonly primaryResumeId: string | null) {}
  user = {
    findUnique: async (_args: unknown) => ({ primaryResumeId: this.primaryResumeId }),
  };
}

function ctx(opts: {
  user?: Partial<{ userId: string; id: string }> | null;
  params?: Record<string, string>;
  metadata?: { min?: number; param?: string | null };
}): ExecutionContext {
  const reflector = new Reflector();
  const handler = () => undefined;
  if (opts.metadata?.min !== undefined) {
    Reflect.defineMetadata('requireMinQuality', opts.metadata.min, handler);
  }
  if (opts.metadata?.param !== undefined) {
    Reflect.defineMetadata('requireMinQualityResumeParam', opts.metadata.param, handler);
  }
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: opts.user ?? undefined, params: opts.params ?? {} }),
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    getClass: () => Object,
    getHandler: () => handler,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}) as never,
    switchToWs: () => ({}) as never,
    getType: () => 'http',
    __reflector: reflector,
  } as unknown as ExecutionContext;
}

function snapshot(score: number): SavedQualityScore {
  return {
    id: 's1',
    resumeId: 'r1',
    overallScore: score,
    completenessScore: score,
    contentQualityScore: score,
    issues: [],
    scoringRulesVersion: '1.0.0',
    aiPromptVersion: null,
    aiCallsCount: 0,
    costUsdMicros: 0n,
    computedAt: new Date(0),
  };
}

function build(repo: FakeRepo, primary: string | null = null): RequireMinQualityGuard {
  const reflector = new Reflector();
  const useCase = new GetLatestQualityUseCase(repo);
  return new RequireMinQualityGuard(reflector, useCase, new FakePrisma(primary) as never);
}

describe('RequireMinQualityGuard', () => {
  it('throws Unauthorized when there is no user on the request', async () => {
    const guard = build(new FakeRepo(null));
    await expect(guard.canActivate(ctx({ user: null }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 409 when the user has no primary resume and no param resumeId', async () => {
    const guard = build(new FakeRepo(snapshot(80)), null);
    await expect(guard.canActivate(ctx({ user: { userId: 'u1' } }))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws 409 when no quality snapshot exists yet', async () => {
    const guard = build(new FakeRepo(null), 'r1');
    await expect(guard.canActivate(ctx({ user: { userId: 'u1' } }))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws 409 when latest score is below the threshold', async () => {
    const guard = build(new FakeRepo(snapshot(40)), 'r1');
    await expect(guard.canActivate(ctx({ user: { userId: 'u1' } }))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('lets the request through when latest score meets the threshold', async () => {
    const guard = build(new FakeRepo(snapshot(70)), 'r1');
    await expect(guard.canActivate(ctx({ user: { userId: 'u1' } }))).resolves.toBe(true);
  });

  it('honours the route param when supplied via metadata', async () => {
    const guard = build(new FakeRepo(snapshot(60)));
    await expect(
      guard.canActivate(
        ctx({
          user: { userId: 'u1' },
          params: { resumeId: 'r-from-param' },
          metadata: { min: 50, param: 'resumeId' },
        }),
      ),
    ).resolves.toBe(true);
  });
});
