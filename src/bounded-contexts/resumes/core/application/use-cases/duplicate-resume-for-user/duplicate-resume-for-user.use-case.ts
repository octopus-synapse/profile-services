import type { LoggerPort } from '@/shared-kernel';
import { sanitizeHtmlContent } from '@/shared-kernel/validation';
import {
  ResumeNotFoundException,
  ResumeSlotLimitReachedException,
  UnknownSectionTypeException,
} from '../../../../domain/exceptions';
import { ResumeEventPublisher } from '../../../../domain/ports';
import { ResumesRepositoryPort } from '../../../ports/resumes-repository.port';
import type { ResumeResult } from '../../../ports/resumes-service.port';
import { MAX_RESUMES_PER_USER } from '../../resume-limits.const';

export interface DuplicateResumeSectionFilter {
  readonly sectionTypeKey: string;
  /** Omitted = copy every item of the section. */
  readonly itemIds?: readonly string[];
}

export interface DuplicateResumeInput {
  readonly title: string;
  readonly styleId?: string;
  readonly language?: string;
  /** Omitted = copy every section. */
  readonly include?: readonly DuplicateResumeSectionFilter[];
}

export class DuplicateResumeForUserUseCase {
  constructor(
    private readonly repository: ResumesRepositoryPort,
    private readonly eventPublisher: ResumeEventPublisher,
    private readonly logger: LoggerPort,
  ) {}

  async execute(
    userId: string,
    sourceResumeId: string,
    data: DuplicateResumeInput,
  ): Promise<ResumeResult> {
    const source = (await this.repository.findResumeByIdAndUserId(
      sourceResumeId,
      userId,
    )) as ResumeResult | null;
    if (!source) throw new ResumeNotFoundException();

    if (data.include) {
      const knownKeys = new Set(
        (source.resumeSections ?? []).map((section) => section.sectionType.key),
      );
      for (const filter of data.include) {
        if (!knownKeys.has(filter.sectionTypeKey)) {
          throw new UnknownSectionTypeException(filter.sectionTypeKey);
        }
      }
    }

    const title = sanitizeHtmlContent(data.title, { allowedTags: [] });

    const resume = await this.repository.duplicateResumeForUserWithQuota(
      userId,
      sourceResumeId,
      { title, styleId: data.styleId, language: data.language },
      data.include ?? null,
      {
        max: MAX_RESUMES_PER_USER,
        exception: new ResumeSlotLimitReachedException(MAX_RESUMES_PER_USER),
      },
    );

    // Same rationale as create (P2-#7): await so a failed audit/projection
    // handler surfaces to the caller.
    await this.eventPublisher.publishResumeDuplicatedAsync(resume.id, {
      userId,
      sourceResumeId,
      newTitle: resume.title ?? '',
    });

    return resume;
  }
}
