import { describe, expect, it } from 'bun:test';
import type { EventPublisher } from '@/shared-kernel';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { type JobForMatch, JobLoaderPort } from '../../../domain/ports/job-loader.port';
import { MatchCachePort } from '../../../domain/ports/match-cache.port';
import {
  RequirementsMatcherPort,
  type RequirementsMatchResult,
} from '../../../domain/ports/requirements-matcher.port';
import { ResumeExistencePort } from '../../../domain/ports/resume-existence.port';
import { ResumeKeywordSourcePort } from '../../../domain/ports/resume-keyword-source.port';
import {
  SemanticMatcherPort,
  type SemanticMatchResult,
} from '../../../domain/ports/semantic-matcher.port';
import type { MatchBreakdown } from '../../../domain/types';
import { ComputeMatchUseCase } from '../compute-match.use-case';

/**
 * Scoring snapshot — fixes the expected match output for a 3×2 grid
 * (resume archetype × job profile). Sub-score providers are stubbed
 * with deterministic values so the snapshot exercises the blender
 * and weight reallocation, not the underlying AI / embeddings paths.
 */

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

class FakeExists extends ResumeExistencePort {
  async exists() {
    return true;
  }
}
class FakeJob extends JobLoaderPort {
  constructor(private readonly job: JobForMatch) {
    super();
  }
  async load() {
    return this.job;
  }
}
class FakeKeywordSource extends ResumeKeywordSourcePort {
  constructor(private readonly kw: readonly string[]) {
    super();
  }
  async getKeywords() {
    return this.kw;
  }
}
class FakeReq extends RequirementsMatcherPort {
  constructor(private readonly result: RequirementsMatchResult) {
    super();
  }
  async match() {
    return this.result;
  }
}
class FakeSem extends SemanticMatcherPort {
  constructor(private readonly result: SemanticMatchResult) {
    super();
  }
  async match() {
    return this.result;
  }
}
class NoopCache extends MatchCachePort {
  async get() {
    return null;
  }
  async set(_key: string, _value: MatchBreakdown) {
    // intentional no-op
  }
  async acquireLock() {
    return { release: async () => {} };
  }
}

const JOB_BACKEND: JobForMatch = {
  id: 'j-backend',
  keywords: ['Go', 'PostgreSQL', 'Kafka'],
  structuredRequirements: { minYears: 5 },
  culturalProfileCaptured: false,
  companyId: null,
};
const JOB_FRONTEND: JobForMatch = {
  id: 'j-frontend',
  keywords: ['React', 'TypeScript', 'CSS'],
  structuredRequirements: { minYears: 3 },
  culturalProfileCaptured: false,
  companyId: null,
};

type Stub = {
  job: JobForMatch;
  resumeKeywords: readonly string[];
  reqScore: number | null;
  semScore: number | null;
};

function build(stub: Stub) {
  return new ComputeMatchUseCase(
    new FakeExists(),
    new FakeJob(stub.job),
    new FakeKeywordSource(stub.resumeKeywords),
    new FakeReq({ score: stub.reqScore }),
    new FakeSem({ score: stub.semScore }),
    new NoopCache(),
    stubEventPublisher,
    stubLogger,
  );
}

async function run(stub: Stub) {
  return build(stub).execute({ userId: 'u1', resumeId: 'r1', jobId: stub.job.id });
}

describe('ComputeMatchUseCase — scoring snapshot', () => {
  it('strong backend candidate × backend job: high overall from job evidence', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Go', 'PostgreSQL', 'Kafka'],
      reqScore: 90,
      semScore: 85,
    });
    expect(r.subScores.keyword.score).toBe(100);
    expect(r.subScores.requirements.score).toBe(90);
    expect(r.subScores.semantic.score).toBe(85);
    expect(r.subScores.fit.score).toBeNull();
    // 0.3125*100 + 0.375*90 + 0.3125*85 = 91.5625 → 92
    expect(r.overallScore).toBe(92);
    expect(r.effectiveWeights).toMatchObject({
      keyword: 0.3125,
      requirements: 0.375,
      semantic: 0.3125,
      fit: 0,
    });
  });

  it('strong candidate × frontend job (mismatched keywords): blender drops keyword to 0', async () => {
    const r = await run({
      job: JOB_FRONTEND,
      resumeKeywords: ['Go', 'Rust'],
      reqScore: 50,
      semScore: 40,
    });
    expect(r.subScores.keyword.score).toBe(0);
    expect(r.overallScore).toBeGreaterThan(0);
    expect(r.overallScore).toBeLessThan(60);
  });

  it('semantic provider degraded (null): weight reallocates, overall recomputed without it', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Go', 'PostgreSQL', 'Kafka'],
      reqScore: 90,
      semScore: null, // AI down
    });
    expect(r.subScores.semantic.score).toBeNull();
    expect(r.effectiveWeights.semantic).toBe(0);
    const sumPresent = r.effectiveWeights.keyword + r.effectiveWeights.requirements;
    expect(sumPresent).toBeCloseTo(1, 5);
    // (100 * 0.3125 + 90 * 0.375) / (0.3125 + 0.375) = 94.55 → 95
    expect(r.overallScore).toBe(95);
  });

  it('all AI sub-scores null: keyword alone carries the blend', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Go', 'PostgreSQL', 'Kafka'],
      reqScore: null,
      semScore: null,
    });
    expect(r.subScores.requirements.score).toBeNull();
    expect(r.subScores.semantic.score).toBeNull();
    expect(r.effectiveWeights.requirements).toBe(0);
    expect(r.effectiveWeights.semantic).toBe(0);
    expect(r.effectiveWeights.fit).toBe(0);
    expect(r.overallScore).toBe(100);
  });

  it('weak candidate × backend job: low overall, no surprises', async () => {
    const r = await run({
      job: JOB_BACKEND,
      resumeKeywords: ['Java'],
      reqScore: 20,
      semScore: 30,
    });
    expect(r.subScores.keyword.score).toBe(0);
    expect(r.overallScore).toBeLessThan(35);
  });

  it('mid candidate × frontend job: balanced sub-scores produce mid overall', async () => {
    const r = await run({
      job: JOB_FRONTEND,
      resumeKeywords: ['React', 'CSS'],
      reqScore: 65,
      semScore: 70,
    });
    // keyword: 2 of 3 matched (React, CSS missing TypeScript) → ~67 (rounded)
    expect(r.subScores.keyword.score).toBeGreaterThanOrEqual(60);
    expect(r.subScores.keyword.score).toBeLessThanOrEqual(80);
    expect(r.overallScore).toBeGreaterThan(55);
    expect(r.overallScore).toBeLessThan(75);
  });
});
