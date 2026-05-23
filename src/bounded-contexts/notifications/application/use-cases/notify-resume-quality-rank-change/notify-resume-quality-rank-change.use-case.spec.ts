import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryNotificationEmail,
  InMemoryNotificationStream,
  InMemoryNotificationsRepository,
  InMemoryResumeQualitySnapshot,
} from '../../../testing';
import { CreateNotificationUseCase } from '../create-notification/create-notification.use-case';
import { NotifyResumeQualityRankChangeUseCase } from './notify-resume-quality-rank-change.use-case';

describe('NotifyResumeQualityRankChangeUseCase', () => {
  let repo: InMemoryNotificationsRepository;
  let snapshots: InMemoryResumeQualitySnapshot;
  let useCase: NotifyResumeQualityRankChangeUseCase;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    snapshots = new InMemoryResumeQualitySnapshot();
    const create = new CreateNotificationUseCase(
      repo,
      new InMemoryNotificationStream(),
      new InMemoryNotificationEmail(),
      stubLogger,
    );
    useCase = new NotifyResumeQualityRankChangeUseCase(snapshots, create, stubLogger);
  });

  it('does nothing when there is only one snapshot', async () => {
    snapshots.setSnapshots('r-1', [{ overallScore: 85, computedAt: new Date() }]);
    snapshots.setOwner('r-1', 'u-1');

    await useCase.execute({ resumeId: 'r-1', overallScore: 85 });
    expect(repo.notifications).toHaveLength(0);
  });

  it('does nothing when both snapshots map to the same rank', async () => {
    snapshots.setSnapshots('r-1', [
      { overallScore: 82, computedAt: new Date() },
      { overallScore: 80, computedAt: new Date() },
    ]);
    snapshots.setOwner('r-1', 'u-1');

    await useCase.execute({ resumeId: 'r-1', overallScore: 82 });
    expect(repo.notifications).toHaveLength(0);
  });

  it('emits RESUME_QUALITY_IMPROVED on a rank-up move', async () => {
    snapshots.setSnapshots('r-1', [
      { overallScore: 90, computedAt: new Date() },
      { overallScore: 70, computedAt: new Date() },
    ]);
    snapshots.setOwner('r-1', 'u-1');

    await useCase.execute({ resumeId: 'r-1', overallScore: 90 });
    expect(repo.notifications).toHaveLength(1);
    expect(repo.notifications[0]?.type).toBe('RESUME_QUALITY_IMPROVED');
  });

  it('emits RESUME_QUALITY_REGRESSED on a rank-down move', async () => {
    snapshots.setSnapshots('r-1', [
      { overallScore: 65, computedAt: new Date() },
      { overallScore: 85, computedAt: new Date() },
    ]);
    snapshots.setOwner('r-1', 'u-1');

    await useCase.execute({ resumeId: 'r-1', overallScore: 65 });
    expect(repo.notifications).toHaveLength(1);
    expect(repo.notifications[0]?.type).toBe('RESUME_QUALITY_REGRESSED');
  });

  // P1 #22 — D band was 20pts (40-59) instead of 10 like the others.
  // After the fix every band spans exactly 10 points (50-59 = D).
  it('rank boundary table: each band spans 10 points (D = 50-59)', async () => {
    snapshots.setOwner('r-band', 'u-1');
    const cases: ReadonlyArray<{ score: number; expectImproved: boolean; prev: number }> = [
      { score: 50, prev: 40, expectImproved: true }, // F (40) → D (50): up
      { score: 49, prev: 50, expectImproved: false }, // D (50) → F (49): down
      { score: 60, prev: 59, expectImproved: true }, // D (59) → C (60): up
      { score: 59, prev: 60, expectImproved: false }, // C (60) → D (59): down
    ];
    for (const c of cases) {
      const repoFresh = new InMemoryNotificationsRepository();
      const snapsFresh = new InMemoryResumeQualitySnapshot();
      const useCaseFresh = new NotifyResumeQualityRankChangeUseCase(
        snapsFresh,
        new CreateNotificationUseCase(
          repoFresh,
          new InMemoryNotificationStream(),
          new InMemoryNotificationEmail(),
          stubLogger,
        ),
        stubLogger,
      );
      snapsFresh.setSnapshots('r-band', [
        { overallScore: c.score, computedAt: new Date() },
        { overallScore: c.prev, computedAt: new Date() },
      ]);
      snapsFresh.setOwner('r-band', 'u-1');

      await useCaseFresh.execute({ resumeId: 'r-band', overallScore: c.score });
      expect(repoFresh.notifications).toHaveLength(1);
      expect(repoFresh.notifications[0]?.type).toBe(
        c.expectImproved ? 'RESUME_QUALITY_IMPROVED' : 'RESUME_QUALITY_REGRESSED',
      );
    }
  });

  it('rank boundary: 40-49 = F (NOT D)', async () => {
    snapshots.setSnapshots('r-1', [
      { overallScore: 45, computedAt: new Date() },
      { overallScore: 55, computedAt: new Date() },
    ]);
    snapshots.setOwner('r-1', 'u-1');

    await useCase.execute({ resumeId: 'r-1', overallScore: 45 });
    expect(repo.notifications).toHaveLength(1);
    expect(repo.notifications[0]?.type).toBe('RESUME_QUALITY_REGRESSED');
  });
});
