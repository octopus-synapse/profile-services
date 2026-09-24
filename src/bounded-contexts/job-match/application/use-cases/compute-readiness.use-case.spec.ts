import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type {
  ReadinessHistoryPort,
  ReadinessTrendPoint,
  SavedReadinessScore,
} from '../../domain/ports/readiness-history.port';
import type { ResumeKeywordSourcePort } from '../../domain/ports/resume-keyword-source.port';
import type { ResumeQualitySourcePort } from '../../domain/ports/resume-quality-source.port';
import type { TargetRoleCoveragePort } from '../../domain/ports/target-role-coverage.port';
import { ComputeReadinessUseCase } from './compute-readiness.use-case';

function build(opts: {
  quality: number | null;
  keywords: readonly string[];
  /** market-relative coverage; null (default) → falls back to count-based. */
  marketCoverage?: number | null;
  history?: Partial<ReadinessHistoryPort>;
}) {
  const qualitySource: ResumeQualitySourcePort = {
    getLatestOverallScore: async () => opts.quality,
  };
  const keywordSource: ResumeKeywordSourcePort = {
    getKeywords: async () => opts.keywords,
  };
  const targetRoleCoverage: TargetRoleCoveragePort = {
    computeCoverage: async () => opts.marketCoverage ?? null,
  };
  const saved: SavedReadinessScore[] = [];
  const history: ReadinessHistoryPort = {
    save: async ({ resumeId, breakdown }) => {
      const row: SavedReadinessScore = {
        id: `r-${saved.length}`,
        resumeId,
        overallScore: breakdown.overallScore,
        qualityScore: breakdown.factors.quality.score,
        coverageScore: breakdown.factors.coverage.score,
        fitScore: breakdown.factors.fit.score,
        rulesVersion: breakdown.rulesVersion,
        computedAt: breakdown.computedAt,
      };
      saved.push(row);
      return row;
    },
    findLatest: async () => saved[saved.length - 1] ?? null,
    findTrend: async (): Promise<readonly ReadinessTrendPoint[]> => [],
    ...opts.history,
  };
  const useCase = new ComputeReadinessUseCase(
    qualitySource,
    keywordSource,
    targetRoleCoverage,
    history,
    stubLogger,
  );
  return { useCase, saved };
}

describe('ComputeReadinessUseCase', () => {
  it('blends quality and coverage without a Fit contribution', async () => {
    // quality 80, 12 distinct keywords → coverage 100
    // 80*0.6875 + 100*0.3125 = 86.25 → 86
    const { useCase } = build({
      quality: 80,
      keywords: [
        'ts',
        'react',
        'node',
        'sql',
        'aws',
        'docker',
        'k8s',
        'go',
        'redis',
        'graphql',
        'rust',
        'python',
      ],
    });
    const { breakdown } = await useCase.execute({ userId: 'u1', resumeId: 'r1' });
    expect(breakdown.overallScore).toBe(86);
    expect(breakdown.factors.coverage.score).toBe(100);
    expect(breakdown.factors.fit.score).toBeNull();
    expect(breakdown.effectiveWeights.fit).toBe(0);
  });

  it('degrades gracefully when quality has never been computed', async () => {
    const { useCase } = build({ quality: null, keywords: ['ts', 'react'] });
    const { breakdown } = await useCase.execute({ userId: 'u1', resumeId: 'r1' });
    expect(breakdown.factors.quality.score).toBeNull();
    expect(breakdown.effectiveWeights.quality).toBe(0);
    expect(Number.isNaN(breakdown.overallScore)).toBe(false);
  });

  it('uses market-relative coverage when available (over the count fallback)', async () => {
    // 12 keywords would give count-coverage 100, but market coverage is 40 →
    // the market number wins. 80*0.6875 + 40*0.3125 = 67.5 → 68.
    const { useCase } = build({
      quality: 80,
      keywords: [
        'ts',
        'react',
        'node',
        'sql',
        'aws',
        'docker',
        'k8s',
        'go',
        'redis',
        'graphql',
        'rust',
        'python',
      ],
      marketCoverage: 40,
    });
    const { breakdown } = await useCase.execute({ userId: 'u1', resumeId: 'r1' });
    expect(breakdown.factors.coverage.score).toBe(40);
    expect(breakdown.overallScore).toBe(68);
  });

  it('deduplicates keywords case-insensitively for coverage', async () => {
    const { useCase } = build({
      quality: null,
      keywords: ['React', 'react', 'REACT'],
    });
    const { breakdown } = await useCase.execute({ userId: 'u1', resumeId: 'r1' });
    // 1 distinct of 12 target → coverage round(1/12*100) = 8
    expect(breakdown.factors.coverage.score).toBe(8);
  });

  it('persists a history row only when persist is requested', async () => {
    const { useCase, saved } = build({ quality: 70, keywords: ['ts'] });
    await useCase.execute({ userId: 'u1', resumeId: 'r1' });
    expect(saved).toHaveLength(0);
    const { saved: row } = await useCase.execute({ userId: 'u1', resumeId: 'r1', persist: true });
    expect(saved).toHaveLength(1);
    expect(row?.overallScore).toBe(saved[0]?.overallScore);
  });
});
