import { describe, expect, it } from 'bun:test';
import type { EventPublisher } from '@/shared-kernel';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  ContentQualityPort,
  type ContentQualityResult,
} from '../../../domain/ports/content-quality.port';
import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../../domain/ports/quality-score.repository.port';
import { ResumeLoaderPort } from '../../../domain/ports/resume-loader.port';
import type { SectionAtsCatalogPort } from '../../../domain/ports/section-ats-catalog.port';
import type { ResumeForCompleteness } from '../../../domain/rules/completeness.rules';
import type { QualityBreakdown } from '../../../domain/types';
import { ComputeQualityUseCase } from '../compute-quality.use-case';

/**
 * Scoring snapshot — locks the expected output of the use-case
 * for a small grid of resume fixtures × AI outcomes. If the blend
 * formula or any sub-rule changes, this is the test that flags it
 * before reaching production. Values are inline so the snapshot is
 * self-documenting; any regression surfaces as a textual diff.
 */

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

class FixtureLoader extends ResumeLoaderPort {
  constructor(private readonly resume: ResumeForCompleteness) {
    super();
  }
  async load() {
    return this.resume;
  }
}

class FixtureContentQuality extends ContentQualityPort {
  constructor(private readonly result: ContentQualityResult) {
    super();
  }
  async analyze() {
    return this.result;
  }
}

class CapturingRepo extends QualityScoreRepositoryPort {
  public last: SavedQualityScore | null = null;
  async save(resumeId: string, breakdown: QualityBreakdown): Promise<SavedQualityScore> {
    this.last = { ...breakdown, id: 'snap', resumeId, computedAt: new Date(0) };
    return this.last;
  }
  async findLatest() {
    return this.last;
  }
  async findLatestForOwner() {
    return { found: false, owned: false, snapshot: null };
  }
  async findHistory() {
    return this.last ? [this.last] : [];
  }
}

const FULL: ResumeForCompleteness = {
  fullName: 'Alex Morgan',
  summary:
    'Backend engineer with 7 years building reliable services in TypeScript and Go for fintech.',
  jobTitle: 'Senior Backend Engineer',
  phone: '+55 11 90000-0000',
  experiences: [
    { startedAt: new Date('2020-01-01'), endedAt: new Date('2023-01-01') },
    { startedAt: new Date('2023-02-01'), endedAt: new Date('2025-06-01') },
  ],
  educations: [
    { institution: 'UFSCar', startedAt: new Date('2014-01-01'), endedAt: new Date('2018-12-01') },
  ],
  skills: [{ name: 'TypeScript' }, { name: 'Go' }, { name: 'PostgreSQL' }],
};

const PARTIAL: ResumeForCompleteness = {
  fullName: 'Sam Chen',
  summary: 'Frontend developer.',
  jobTitle: null,
  experiences: [{ startedAt: new Date('2024-01-01') }],
  educations: [],
  skills: [{ name: 'React' }],
};

const SPARSE: ResumeForCompleteness = {
  fullName: '',
  summary: null,
  jobTitle: null,
  experiences: [],
  educations: [],
  skills: [],
};

const HIGH_AI: ContentQualityResult = {
  score: 80,
  issues: [],
  promptVersion: 'analyze-content-quality@1.0.0#aaaaaaaa',
  callsCount: 1,
  costUsdMicros: 5_000n,
};

const NULL_AI: ContentQualityResult = {
  score: null,
  issues: [],
  promptVersion: null,
  callsCount: 0,
  costUsdMicros: 0n,
};

const stubSectionCatalog: SectionAtsCatalogPort = {
  loadCatalog: async () => [],
} as SectionAtsCatalogPort;

async function run(resume: ResumeForCompleteness, ai: ContentQualityResult) {
  const repo = new CapturingRepo();
  const useCase = new ComputeQualityUseCase(
    new FixtureLoader(resume),
    new FixtureContentQuality(ai),
    repo,
    stubEventPublisher,
    stubLogger,
    stubSectionCatalog,
  );
  return useCase.execute('r1');
}

describe('ComputeQualityUseCase — scoring snapshot', () => {
  it('FULL resume × HIGH AI: 0.4*completeness + 0.6*ai', async () => {
    const r = await run(FULL, HIGH_AI);
    expect(r.completenessScore).toBe(100);
    expect(r.contentQualityScore).toBe(80);
    expect(r.overallScore).toBe(88); // 0.4*100 + 0.6*80
    expect(r.aiPromptVersion).toBe('analyze-content-quality@1.0.0#aaaaaaaa');
  });

  it('FULL resume × NULL AI: degrades to completeness alone', async () => {
    const r = await run(FULL, NULL_AI);
    expect(r.completenessScore).toBe(100);
    expect(r.contentQualityScore).toBeNull();
    expect(r.overallScore).toBe(100);
  });

  it('PARTIAL resume × HIGH AI: completeness drops, blend reflects it', async () => {
    const r = await run(PARTIAL, HIGH_AI);
    expect(r.completenessScore).toBeLessThan(100);
    expect(r.completenessScore).toBeGreaterThan(0);
    expect(r.contentQualityScore).toBe(80);
    // Blend bounded by inputs: must lie between completeness and AI score.
    const lo = Math.min(r.completenessScore, 80);
    const hi = Math.max(r.completenessScore, 80);
    expect(r.overallScore).toBeGreaterThanOrEqual(lo);
    expect(r.overallScore).toBeLessThanOrEqual(hi);
  });

  it('SPARSE resume × NULL AI: completeness floor applies, no AI lift', async () => {
    const r = await run(SPARSE, NULL_AI);
    expect(r.completenessScore).toBeLessThan(50);
    expect(r.contentQualityScore).toBeNull();
    expect(r.overallScore).toBe(r.completenessScore);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('SPARSE resume × HIGH AI: AI cannot fully rescue an empty resume', async () => {
    const r = await run(SPARSE, HIGH_AI);
    // 0.4 * (low) + 0.6 * 80 — strictly above completeness, strictly below 80.
    expect(r.overallScore).toBeGreaterThan(r.completenessScore);
    expect(r.overallScore).toBeLessThan(80);
  });
});
