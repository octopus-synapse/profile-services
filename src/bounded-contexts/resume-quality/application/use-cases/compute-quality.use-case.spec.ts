import { beforeEach, describe, expect, it } from 'bun:test';
import type { EventPublisher, LoggerPort } from '@/shared-kernel';
import {
  ContentQualityPort,
  type ContentQualityResult,
} from '../../domain/ports/content-quality.port';

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

const stubLogger: LoggerPort = { log: () => {}, debug: () => {}, warn: () => {}, error: () => {} };

import {
  QualityScoreRepositoryPort,
  type SavedQualityScore,
} from '../../domain/ports/quality-score.repository.port';
import { ResumeLoaderPort } from '../../domain/ports/resume-loader.port';
import type { ResumeForCompleteness } from '../../domain/rules/completeness.rules';
import type { QualityBreakdown } from '../../domain/types';
import { ComputeQualityUseCase, ResumeNotFoundForQualityError } from './compute-quality.use-case';

class InMemoryResumeLoader extends ResumeLoaderPort {
  private readonly rows = new Map<string, ResumeForCompleteness>();
  seed(resumeId: string, resume: ResumeForCompleteness) {
    this.rows.set(resumeId, resume);
  }
  async load(resumeId: string) {
    return this.rows.get(resumeId) ?? null;
  }
}

class StubContentQuality extends ContentQualityPort {
  constructor(private readonly result: ContentQualityResult | Error) {
    super();
  }
  async analyze(): Promise<ContentQualityResult> {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class InMemoryQualityRepo extends QualityScoreRepositoryPort {
  public saved: SavedQualityScore[] = [];
  async save(resumeId: string, breakdown: QualityBreakdown): Promise<SavedQualityScore> {
    const saved: SavedQualityScore = {
      ...breakdown,
      id: `snap-${this.saved.length + 1}`,
      resumeId,
      computedAt: new Date('2026-04-23T12:00:00Z'),
    };
    this.saved.push(saved);
    return saved;
  }
  async findLatest(resumeId: string) {
    return this.saved.filter((s) => s.resumeId === resumeId).at(-1) ?? null;
  }
  async findHistory(resumeId: string, limit: number) {
    return this.saved.filter((s) => s.resumeId === resumeId).slice(-limit);
  }
}

function fullResume(): ResumeForCompleteness {
  return {
    fullName: 'Jane Doe',
    emailContact: 'jane@example.com',
    summary:
      'Senior backend engineer with 8 years shipping reliable services in Go and Rust for fintech.',
    jobTitle: 'Senior Backend Engineer',
    experiences: [{ startedAt: new Date('2022-01-01'), endedAt: new Date('2024-01-01') }],
    educations: [{ institution: 'UFSCar' }],
    skills: [{ name: 'Go' }, { name: 'Rust' }],
  };
}

describe('ComputeQualityUseCase', () => {
  let loader: InMemoryResumeLoader;
  let repo: InMemoryQualityRepo;

  beforeEach(() => {
    loader = new InMemoryResumeLoader();
    repo = new InMemoryQualityRepo();
  });

  it('throws when the resume does not exist', async () => {
    const contentQuality = new StubContentQuality({
      score: 80,
      issues: [],
      promptVersion: 'content-quality@1.0.0#deadbeef',
      callsCount: 1,
      costUsdMicros: 123n,
    });
    const useCase = new ComputeQualityUseCase(
      loader,
      contentQuality,
      repo,
      stubEventPublisher,
      stubLogger,
    );
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(ResumeNotFoundForQualityError);
  });

  it('persists a snapshot blending completeness and AI content quality', async () => {
    loader.seed('r1', fullResume());
    const contentQuality = new StubContentQuality({
      score: 70,
      issues: [{ code: 'AI_NO_METRIC', severity: 'medium' }],
      promptVersion: 'content-quality@1.0.0#deadbeef',
      callsCount: 1,
      costUsdMicros: 123n,
    });
    const useCase = new ComputeQualityUseCase(
      loader,
      contentQuality,
      repo,
      stubEventPublisher,
      stubLogger,
    );

    const snapshot = await useCase.execute('r1');

    // Completeness = 100, ContentQuality = 70 → 0.4*100 + 0.6*70 = 82
    expect(snapshot.overallScore).toBe(82);
    expect(snapshot.completenessScore).toBe(100);
    expect(snapshot.contentQualityScore).toBe(70);
    expect(snapshot.issues).toHaveLength(1);
    expect(snapshot.aiPromptVersion).toBe('content-quality@1.0.0#deadbeef');
    expect(repo.saved).toHaveLength(1);
  });

  it('falls back to completeness alone when the AI port fails', async () => {
    loader.seed('r1', fullResume());
    const contentQuality = new StubContentQuality(new Error('openai down'));
    const useCase = new ComputeQualityUseCase(
      loader,
      contentQuality,
      repo,
      stubEventPublisher,
      stubLogger,
    );

    const snapshot = await useCase.execute('r1');

    expect(snapshot.overallScore).toBe(snapshot.completenessScore);
    expect(snapshot.contentQualityScore).toBeNull();
    expect(snapshot.aiPromptVersion).toBeNull();
  });
});
