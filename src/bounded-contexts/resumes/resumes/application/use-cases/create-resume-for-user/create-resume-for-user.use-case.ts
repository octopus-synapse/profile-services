import sanitizeHtml from 'sanitize-html';
import type { CreateResume } from '@/shared-kernel';
import type { ResumeEventPublisher } from '../../../../shared-kernel/domain/ports';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeResult } from '../../../ports/resumes-service.port';

const MAX_RESUMES_PER_USER = 4;

function sanitizeContent(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  if (typeof text !== 'string') return undefined;
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export class CreateResumeForUserUseCase {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
  ) {}

  async execute(userId: string, data: CreateResume): Promise<ResumeResult> {
    await this.ensureUserHasSlots(userId);

    const sanitizedTitle = sanitizeContent(data.title);
    const sanitizedSummary = sanitizeContent(data.summary);

    const sanitizedData = {
      ...data,
      title: sanitizedTitle ?? '',
      summary: sanitizedSummary,
    };

    const resume = await this.repository.createResumeForUser(userId, sanitizedData);

    this.eventPublisher.publishResumeCreated(resume.id, {
      userId,
      title: resume.title ?? '',
    });

    return resume;
  }

  private async ensureUserHasSlots(userId: string): Promise<void> {
    const existing = await this.repository.findAllUserResumes(userId);
    if (existing.length >= MAX_RESUMES_PER_USER) {
      const { UnprocessableEntityException } = await import('@nestjs/common');
      throw new UnprocessableEntityException(
        `Resume limit reached. Maximum ${MAX_RESUMES_PER_USER} resumes allowed.`,
      );
    }
  }
}
