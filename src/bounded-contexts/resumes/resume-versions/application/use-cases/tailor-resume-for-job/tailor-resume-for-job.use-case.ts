/**
 * Run the AI pipeline to tailor a master resume for a specific job and
 * persist the result as a new tailored ResumeVersion. The persisted
 * snapshot keeps both the master at tailor-time ("before") and the LLM
 * diff ("after") so the diff endpoint stays accurate even if the master
 * later changes.
 */

import {
  ResumeNotFoundException,
  ResumeNotOwnedException,
  ResumeTailorInputRequiredException,
  TailorEngineUnavailableException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import { LoggerPort } from '@/shared-kernel';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  JobForTailor,
  ResumeForTailor,
  TailorJobInput,
  TailorResumeResult,
} from '../../../domain/entities/tailor';
import { ResumeTailorLlmPort } from '../../../domain/ports/resume-tailor-llm.port';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';

export class TailorResumeForJobUseCase {
  constructor(
    private readonly repository: ResumeVersionsRepositoryPort,
    private readonly llm: ResumeTailorLlmPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(input: TailorJobInput): Promise<TailorResumeResult> {
    const resume = await this.loadOwnedResume(input.resumeId, input.userId);
    const job = await this.resolveJob(input);

    let tailored: Awaited<ReturnType<typeof this.llm.tailorResume>>;
    try {
      tailored = await this.llm.tailorResume({
        resume: {
          summary: resume.summary,
          jobTitle: resume.jobTitle,
          primaryStack: resume.primaryStack,
          sections: resume.resumeSections.map((section) => ({
            key: section.sectionType.key,
            semanticKind: section.sectionType.semanticKind,
            items: section.items.map((item) => ({ id: item.id, content: item.content })),
          })),
        },
        job,
      });
    } catch (err) {
      // The LLM port can fail in many ways (rate limit, network, provider
      // outage). Wrap in a typed domain exception so the global filter
      // emits a translated 503 instead of a raw 500 — and so retry logic
      // upstream can branch on `err instanceof TailorEngineUnavailableException`.
      this.logger.warn(
        `Tailor LLM failed for resume ${resume.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        'TailorResumeForJobUseCase',
      );
      throw new TailorEngineUnavailableException();
    }

    const lastVersionNumber = await this.repository.findLastVersionNumber(resume.id);
    const nextNumber = (lastVersionNumber ?? 0) + 1;

    const label = this.labelFor(job);

    const snapshot = {
      master: {
        summary: resume.summary,
        jobTitle: resume.jobTitle,
        bullets: this.flattenBullets(resume),
      },
      tailored: {
        summary: tailored.summary,
        jobTitle: tailored.jobTitle,
        bullets: tailored.bullets,
      },
    };

    const created = await this.repository.createResumeVersion({
      resumeId: resume.id,
      versionNumber: nextNumber,
      snapshot,
      label,
      isTailored: true,
      tailoredJobId: input.jobId ?? null,
    });

    return {
      versionId: created.id,
      versionNumber: created.versionNumber,
      label: created.label ?? label,
      summary: tailored.summary,
      jobTitle: tailored.jobTitle,
      bullets: tailored.bullets,
    };
  }

  private async loadOwnedResume(resumeId: string, userId: string): Promise<ResumeForTailor> {
    const resume = await this.repository.findResumeForTailor(resumeId);
    if (!resume) throw new ResumeNotFoundException();
    if (resume.userId !== userId) throw new ResumeNotOwnedException();
    return resume;
  }

  private async resolveJob(input: TailorJobInput): Promise<JobForTailor> {
    if (input.jobId) {
      const job = await this.repository.findJobById(input.jobId);
      if (!job) throw new EntityNotFoundException('Job', input.jobId);
      return job;
    }

    if (!input.jobDescription || input.jobDescription.trim().length < 10) {
      throw new ResumeTailorInputRequiredException();
    }

    return {
      title: input.jobTitle ?? 'Target role',
      company: input.jobCompany ?? 'Unknown company',
      description: input.jobDescription,
      requirements: [],
      skills: [],
    };
  }

  private flattenBullets(resume: ResumeForTailor): Array<{ id: string; content: string }> {
    const out: Array<{ id: string; content: string }> = [];
    for (const section of resume.resumeSections) {
      for (const item of section.items) {
        const content = item.content as Record<string, unknown> | null;
        if (!content) continue;
        const pick =
          (typeof content.description === 'string' && content.description) ||
          (typeof content.title === 'string' && content.title) ||
          (typeof content.name === 'string' && content.name) ||
          '';
        if (pick) out.push({ id: item.id, content: pick });
      }
    }
    return out;
  }

  private labelFor(job: { title: string; company: string }): string {
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
    return `Tailored for ${clean(job.company)} — ${clean(job.title)}`.slice(0, 180);
  }
}
