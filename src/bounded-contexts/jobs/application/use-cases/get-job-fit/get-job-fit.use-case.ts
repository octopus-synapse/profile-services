/**
 * Fit-score breakdown for a job against the viewer's primary resume.
 *
 * Builds a condensed job description from the stored fields (title +
 * requirements + skills + description) and reuses the existing keyword
 * match engine via `ResumeAnalyticsFacade` so we don't duplicate
 * scoring logic. A lightweight dimensional breakdown is derived
 * directly from the structured fields so the UI can render bars.
 */

import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { NoPrimaryResumeException } from '../../../domain/exceptions/jobs.exceptions';
import { JobsRepositoryPort } from '../../../domain/ports/jobs.repository.port';
import { ResumeJobMatcherPort } from '../../../domain/ports/resume-job-matcher.port';
import { extractSoftSignals, percentOverlap } from '../../services/fit-signals.service';

export class GetJobFitUseCase {
  constructor(
    private readonly repository: JobsRepositoryPort,
    private readonly matcher: ResumeJobMatcherPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(jobId: string, userId: string): Promise<unknown> {
    const job = await this.repository.findJobById(jobId);
    if (!job) throw new EntityNotFoundException('Job', jobId);

    const primaryResumeId = await this.repository.getPrimaryResumeId(userId);
    if (!primaryResumeId) {
      throw new NoPrimaryResumeException();
    }

    // Consolidated text the matcher can scan. Requirements/skills first so
    // they outweigh the marketing copy in the description.
    const jobText = [
      job.title,
      (job.requirements ?? []).join('\n'),
      (job.skills ?? []).join(', '),
      job.description,
    ]
      .filter(Boolean)
      .join('\n\n');

    const match = await this.matcher.matchJobDescription(primaryResumeId, userId, jobText);

    const hardSkillsPct = percentOverlap(job.skills ?? [], match.matchedKeywords);
    const softSkillsPct = percentOverlap(
      extractSoftSignals(job.description),
      match.matchedKeywords,
    );

    return {
      ...match,
      dimensions: { hardSkills: hardSkillsPct, softSkills: softSkillsPct },
    };
  }
}
