import type { CreateResume, LoggerPort } from '@/shared-kernel';
import { sanitizeHtmlContent } from '@/shared-kernel/validation';
import { ResumeSlotLimitReachedException } from '../../../../domain/exceptions';
import { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeResult } from '../../../ports/resumes-service.port';

const MAX_RESUMES_PER_USER = 4;

function sanitizeContent(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  if (typeof text !== 'string') return undefined;
  return sanitizeHtmlContent(text, { allowedTags: [] });
}

export class CreateResumeForUserUseCase {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string, data: CreateResume): Promise<ResumeResult> {
    const sanitizedTitle = sanitizeContent(data.title);
    const sanitizedSummary = sanitizeContent(data.summary);

    const sanitizedData = { ...data, title: sanitizedTitle ?? '', summary: sanitizedSummary };

    const resume = await this.repository.createResumeForUserWithQuota(userId, sanitizedData, {
      max: MAX_RESUMES_PER_USER,
      exception: new ResumeSlotLimitReachedException(MAX_RESUMES_PER_USER),
    });

    // P2-#7: await so a failed audit/projection handler surfaces to the caller.
    await this.eventPublisher.publishResumeCreatedAsync(resume.id, {
      userId,
      title: resume.title ?? '',
    });

    return resume;
  }
}
