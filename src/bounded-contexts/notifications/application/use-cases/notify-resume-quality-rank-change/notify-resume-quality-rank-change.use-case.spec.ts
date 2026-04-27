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
});
