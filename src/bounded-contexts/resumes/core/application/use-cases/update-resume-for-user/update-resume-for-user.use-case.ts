import type { UpdateResume } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumeVersionServicePort } from '../../../ports/resume-version-service.port';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeResult } from '../../../ports/resumes-service.port';

function sanitizeContent(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  if (typeof text !== 'string') return undefined;
  return text.replace(/<[^>]*>/g, '');
}

export class UpdateResumeForUserUseCase {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly versionService: ResumeVersionServicePort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(id: string, userId: string, data: UpdateResume): Promise<ResumeResult> {
    await this.createSnapshotSafely(id);

    const sanitizedData = {
      ...data,
      title: sanitizeContent(data.title),
      summary: sanitizeContent(data.summary),
    };

    const resume = await this.repository.updateResumeForUser(id, userId, sanitizedData);
    if (!resume) throw new EntityNotFoundException('Resume', id);

    this.eventPublisher.publishResumeUpdated(id, {
      userId,
      changedFields: Object.keys(data),
    });

    return resume;
  }

  private async createSnapshotSafely(resumeId: string): Promise<void> {
    try {
      await this.versionService.createSnapshot(resumeId);
    } catch {
      // Snapshot failure should not block update
    }
  }
}
