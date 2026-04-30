import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { PostAlreadyReportedException } from '../../../domain/exceptions/feed.exceptions';
import { InMemoryReportRepository } from '../../../testing';
import { ReportPostUseCase } from './report-post.use-case';

describe('ReportPostUseCase', () => {
  it('creates a report', async () => {
    const repo = new InMemoryReportRepository();
    repo.seedPost('p1');
    const out = await new ReportPostUseCase(repo).execute('p1', 'me', 'spam');
    expect(out.reason).toBe('spam');
  });

  it('throws when already reported', async () => {
    const repo = new InMemoryReportRepository();
    repo.seedPost('p1');
    await new ReportPostUseCase(repo).execute('p1', 'me', 'spam');
    await expect(new ReportPostUseCase(repo).execute('p1', 'me', 'again')).rejects.toThrow(
      PostAlreadyReportedException,
    );
  });

  it('throws when post not found', async () => {
    const repo = new InMemoryReportRepository();
    await expect(new ReportPostUseCase(repo).execute('missing', 'me', 'r')).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
