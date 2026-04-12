import { NotFoundException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import type { UpdateResume } from '@/shared-kernel';
import type { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumeVersionServicePort } from '../../../ports/resume-version-service.port';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeResult } from '../../../ports/resumes-service.port';

function sanitizeContent(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  if (typeof text !== 'string') return undefined;
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
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
    if (!resume) throw new NotFoundException('Resume not found');

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
