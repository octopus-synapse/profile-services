import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type {
  ReadinessHistoryPort,
  ReadinessTrendPoint,
  SavedReadinessScore,
} from '../../domain/ports/readiness-history.port';
import type { ResumeKeywordSourcePort } from '../../domain/ports/resume-keyword-source.port';
import type { ResumeQualitySourcePort } from '../../domain/ports/resume-quality-source.port';
import type {
  FitLifecycleRead,
  LatestQualityRead,
  ScoresReadPort,
  ScoreTrendRead,
} from '../../domain/ports/scores-read.port';
import type { TargetRoleCoveragePort } from '../../domain/ports/target-role-coverage.port';
import type { FitStatus, UserFitStatePort } from '../../domain/ports/user-fit-state.port';
import { ComputeReadinessUseCase } from './compute-readiness.use-case';
import { GetMeScoresUseCase } from './get-me-scores.use-case';

function buildReadiness(opts: {
  quality: number | null;
  keywords: readonly string[];
  fit: FitStatus;
}) {
  const qualitySource: ResumeQualitySourcePort = {
    getLatestOverallScore: async () => opts.quality,
  };
  const keywordSource: ResumeKeywordSourcePort = { getKeywords: async () => opts.keywords };
  const fitState: UserFitStatePort = {
    getStatus: async (userId) => ({ userId, status: opts.fit }),
  };
  const history: ReadinessHistoryPort = {
    save: async () => ({}) as SavedReadinessScore,
    findLatest: async () => null,
    findTrend: async (): Promise<readonly ReadinessTrendPoint[]> => [],
  };
  const targetRoleCoverage: TargetRoleCoveragePort = { computeCoverage: async () => null };
  return new ComputeReadinessUseCase(
    qualitySource,
    keywordSource,
    targetRoleCoverage,
    fitState,
    history,
    stubLogger,
  );
}

function reads(overrides: Partial<ScoresReadPort>): ScoresReadPort {
  return {
    getPrimaryResumeId: async () => null,
    getLatestQuality: async (): Promise<LatestQualityRead | null> => null,
    getQualityTrend: async (): Promise<readonly ScoreTrendRead[]> => [],
    getStyleScoreForResume: async () => null,
    getFitLifecycle: async (): Promise<FitLifecycleRead> => ({ status: 'never', expiresAt: null }),
    ...overrides,
  };
}

const emptyHistory: ReadinessHistoryPort = {
  save: async () => ({}) as SavedReadinessScore,
  findLatest: async () => null,
  findTrend: async () => [],
};

describe('GetMeScoresUseCase', () => {
  it('returns a cold-start view (readiness + fit only) when there is no master resume', async () => {
    const useCase = new GetMeScoresUseCase(
      reads({ getPrimaryResumeId: async () => null }),
      buildReadiness({ quality: null, keywords: [], fit: 'never' }),
      emptyHistory,
      stubLogger,
    );
    const view = await useCase.execute('u1');
    expect(view.resumeId).toBeNull();
    expect(view.quality).toBeNull();
    expect(view.style).toBeNull();
    expect(view.fit.status).toBe('never');
    expect(Number.isNaN(view.readiness.breakdown.overallScore)).toBe(false);
  });

  it('composes readiness + quality + style + fit for a master resume', async () => {
    const useCase = new GetMeScoresUseCase(
      reads({
        getPrimaryResumeId: async () => 'resume-1',
        getLatestQuality: async () => ({
          overallScore: 82,
          completenessScore: 90,
          contentQualityScore: 76,
          computedAt: new Date('2026-06-01T00:00:00Z'),
        }),
        getStyleScoreForResume: async () => 88,
        getFitLifecycle: async () => ({
          status: 'responded',
          expiresAt: new Date('2026-12-01T00:00:00Z'),
        }),
      }),
      buildReadiness({ quality: 82, keywords: ['ts', 'react'], fit: 'responded' }),
      emptyHistory,
      stubLogger,
    );
    const view = await useCase.execute('u1');
    expect(view.resumeId).toBe('resume-1');
    expect(view.quality?.latest.overallScore).toBe(82);
    expect(view.style?.score).toBe(88);
    expect(view.fit.status).toBe('responded');
    // rank of readiness overall is served at the top level
    expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(view.rank);
  });
});
