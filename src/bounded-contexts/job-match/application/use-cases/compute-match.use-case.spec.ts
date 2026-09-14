import { beforeEach, describe, expect, it } from 'bun:test';
import type { EventPublisher } from '@/shared-kernel';
import { stubLogger } from '@/shared-kernel/logger/testing';

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

import {
  JobMatchJobNotFoundException,
  JobMatchResumeNotFoundException,
} from '../../domain/exceptions/job-match.exceptions';
import { type JobForMatch, JobLoaderPort } from '../../domain/ports/job-loader.port';
import { MatchCachePort } from '../../domain/ports/match-cache.port';
import {
  RequirementsMatcherPort,
  type RequirementsMatchResult,
} from '../../domain/ports/requirements-matcher.port';
import { ResumeExistencePort } from '../../domain/ports/resume-existence.port';
import { ResumeKeywordSourcePort } from '../../domain/ports/resume-keyword-source.port';
import {
  SemanticMatcherPort,
  type SemanticMatchResult,
} from '../../domain/ports/semantic-matcher.port';
import type { MatchBreakdown } from '../../domain/types';
import { ComputeMatchUseCase } from './compute-match.use-case';

class FakeResumeExistence extends ResumeExistencePort {
  constructor(private readonly present: boolean) {
    super();
  }
  async exists() {
    return this.present;
  }
}

class FakeJobLoader extends JobLoaderPort {
  constructor(private readonly job: JobForMatch | null) {
    super();
  }
  async load() {
    return this.job;
  }
}

class FakeKeywordSource extends ResumeKeywordSourcePort {
  constructor(private readonly keywords: readonly string[]) {
    super();
  }
  async getKeywords() {
    return this.keywords;
  }
}

class FakeRequirements extends RequirementsMatcherPort {
  constructor(private readonly result: RequirementsMatchResult | Error) {
    super();
  }
  async match() {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class FakeSemantic extends SemanticMatcherPort {
  constructor(private readonly result: SemanticMatchResult | Error) {
    super();
  }
  async match() {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class InMemoryMatchCache extends MatchCachePort {
  public reads = 0;
  public writes = 0;
  private store = new Map<string, MatchBreakdown>();
  async get(key: string) {
    this.reads++;
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: MatchBreakdown) {
    this.writes++;
    this.store.set(key, value);
  }
  async acquireLock() {
    // Tests don't exercise the single-flight path; granting unilaterally
    // keeps existing scenarios deterministic.
    return { release: async () => {} };
  }
}

function defaultJob(overrides: Partial<JobForMatch> = {}): JobForMatch {
  return {
    id: 'j1',
    keywords: ['Rust', 'Tokio'],
    structuredRequirements: { minYears: 5 },
    culturalProfileCaptured: false,
    companyId: null,
    ...overrides,
  };
}

describe('ComputeMatchUseCase', () => {
  let cache: InMemoryMatchCache;

  beforeEach(() => {
    cache = new InMemoryMatchCache();
  });

  function build(
    overrides: {
      exists?: boolean;
      job?: JobForMatch | null;
      keywords?: readonly string[];
      requirements?: RequirementsMatchResult | Error;
      semantic?: SemanticMatchResult | Error;
    } = {},
  ) {
    return new ComputeMatchUseCase(
      new FakeResumeExistence(overrides.exists ?? true),
      new FakeJobLoader(overrides.job === undefined ? defaultJob() : overrides.job),
      new FakeKeywordSource(overrides.keywords ?? ['Rust', 'Tokio']),
      new FakeRequirements(
        overrides.requirements ?? { score: 80, detail: { matchedSlots: [], missingSlots: [] } },
      ),
      new FakeSemantic(overrides.semantic ?? { score: 75 }),
      cache,
      stubEventPublisher,
      stubLogger,
    );
  }

  it('throws when the resume is missing', async () => {
    const useCase = build({ exists: false });
    await expect(
      useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' }),
    ).rejects.toBeInstanceOf(JobMatchResumeNotFoundException);
  });

  it('throws when the job is missing', async () => {
    const useCase = build({ job: null });
    await expect(
      useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' }),
    ).rejects.toBeInstanceOf(JobMatchJobNotFoundException);
  });

  it('computes Match without consulting a Fit profile', async () => {
    const useCase = build();
    const result = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(result.subScores.fit.score).toBeNull();
    expect(result.effectiveWeights.fit).toBe(0);
    expect(result.overallScore).toBe(85);
  });

  it('composes the overall score from three job-related sub-scores', async () => {
    const useCase = build();
    const result = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(result.subScores.keyword.score).toBe(100);
    expect(result.subScores.requirements.score).toBe(80);
    expect(result.subScores.semantic.score).toBe(75);
    expect(result.subScores.fit.score).toBeNull();
    expect(result.effectiveWeights.fit).toBe(0);
    expect(result.overallScore).toBe(85);
    expect(cache.writes).toBe(1);
  });

  it('degrades gracefully when the semantic adapter throws', async () => {
    const useCase = build({ semantic: new Error('openai down') });
    const result = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(result.subScores.semantic.score).toBeNull();
    expect(result.effectiveWeights.semantic).toBe(0);
    // Remaining weights must still sum to 1
    const sum = result.effectiveWeights.keyword + result.effectiveWeights.requirements;
    expect(sum).toBeCloseTo(1, 5);
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it('does not score a cultural profile in candidate Match', async () => {
    const useCase = build({
      job: defaultJob({ culturalProfileCaptured: true, companyId: 'c1' }),
    });
    const result = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(result.subScores.fit.score).toBeNull();
    expect(result.overallScore).toBe(85);
  });

  it('serves a cached breakdown when present and does not rerun sub-scores', async () => {
    const useCase = build();
    const first = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    const second = await useCase.execute({ userId: 'u1', resumeId: 'r1', jobId: 'j1' });
    expect(second).toEqual(first);
    expect(cache.reads).toBeGreaterThanOrEqual(2);
    // Only the first run wrote to the cache.
    expect(cache.writes).toBe(1);
  });
});
