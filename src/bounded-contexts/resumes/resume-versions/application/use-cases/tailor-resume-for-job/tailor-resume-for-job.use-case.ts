/**
 * Run the AI pipeline to tailor a master resume for a specific job and
 * persist the result as a new tailored ResumeVersion. The persisted
 * snapshot keeps both the master at tailor-time ("before") and the LLM
 * diff ("after") so the diff endpoint stays accurate even if the master
 * later changes.
 *
 * `jobId` resolves polymorphically: internal `Job` first, then the
 * `ExternalJobListing` mirror (JSearch) — external targets persist a
 * bare id + title/company snapshot since the mirror row is swept after
 * 30 days. When the target resolved, the response also carries a
 * best-effort compatibility estimate (before/after) derived from the
 * keywords the tailoring actually injected.
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
  ResolvedTailorJob,
  ResumeForTailor,
  TailorJobInput,
  TailorMatchEstimate,
  TailorResumeResult,
} from '../../../domain/entities/tailor';
import { PreparationMeterPort } from '../../../domain/ports/preparation-meter.port';
import { ResumeTailorLlmPort } from '../../../domain/ports/resume-tailor-llm.port';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';
import { TailorMatchPort } from '../../../domain/ports/tailor-match.port';
import { estimateTailoredMatch } from '../../../domain/rules/estimate-tailored-match.rules';

export class TailorResumeForJobUseCase {
  constructor(
    private readonly repository: ResumeVersionsRepositoryPort,
    private readonly llm: ResumeTailorLlmPort,
    private readonly logger: LoggerPort,
    /** Best-effort compatibility estimate; null disables the signal. */
    private readonly match: TailorMatchPort | null = null,
    private readonly meter: PreparationMeterPort | null = null,
    private readonly ensureTargetLocale?: (
      resumeId: string,
      locale: 'pt-BR' | 'en',
    ) => Promise<void>,
  ) {}

  async execute(input: TailorJobInput): Promise<TailorResumeResult> {
    const resume = await this.loadOwnedResume(input.resumeId, input.userId);
    const resolved = await this.resolveJob(input);
    const sourceLocale = resume.language === 'en' ? 'en' : 'pt-BR';
    const targetLocale =
      input.targetLocale ??
      detectJobLocale(resolved.job.description, resolved.job.title) ??
      sourceLocale;
    const reservation = (await this.meter?.reserve(input.userId)) ?? null;

    try {
      let contentResume = resume;
      if (targetLocale !== sourceLocale && this.ensureTargetLocale) {
        await this.ensureTargetLocale(resume.id, targetLocale);
        contentResume =
          (await this.repository.findResumeForTailor(resume.id, targetLocale)) ?? resume;
      }
      let tailored: Awaited<ReturnType<typeof this.llm.tailorResume>>;
      try {
        tailored = await this.llm.tailorResume({
          resume: {
            summary: contentResume.summary,
            jobTitle: contentResume.jobTitle,
            primaryStack: contentResume.primaryStack,
            sections: contentResume.resumeSections.map((section) => ({
              key: section.sectionType.key,
              semanticKind: section.sectionType.semanticKind,
              items: section.items.map((item) => ({ id: item.id, content: item.content })),
            })),
          },
          job: resolved.job,
          sourceLocale: contentResume === resume ? sourceLocale : targetLocale,
          targetLocale,
          ...(input.candidateContext ? { candidateContext: input.candidateContext } : {}),
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

      if (tailored.usage) {
        try {
          await this.meter?.recordAiUsage?.({
            userId: input.userId,
            operation: 'tailor-resume',
            ...tailored.usage,
          });
        } catch (error) {
          this.logger.warn(
            `Could not record AI usage: ${error instanceof Error ? error.message : 'unknown'}`,
            'TailorResumeForJobUseCase',
          );
        }
      }

      const label = this.labelFor(resolved.job);

      const snapshot = {
        targetLocale,
        master: {
          summary: contentResume.summary,
          jobTitle: contentResume.jobTitle,
          bullets: this.flattenBullets(contentResume),
        },
        tailored: {
          summary: tailored.summary,
          jobTitle: tailored.jobTitle,
          bullets: tailored.bullets,
          coverLetter: tailored.coverLetter ?? null,
        },
      };

      // P1 #16 — adapter allocates versionNumber under the unique
      // constraint with retry, so two concurrent tailor calls for the
      // same resume both succeed with distinct sequential numbers.
      const created = await this.repository.createNextResumeVersion(resume.id, {
        snapshot,
        label,
        isTailored: true,
        tailoredJobId: resolved.internalJobId,
        tailoredExternalJobId: resolved.externalJobId,
        tailoredJobTitleSnapshot: resolved.job.title,
        tailoredJobCompanySnapshot: resolved.job.company,
      });

      const match = await this.estimateMatch(input, resolved, tailored.bullets);

      return {
        targetLocale,
        versionId: created.id,
        versionNumber: created.versionNumber,
        label: created.label ?? label,
        summary: tailored.summary,
        jobTitle: tailored.jobTitle,
        bullets: tailored.bullets,
        coverLetter: tailored.coverLetter ?? null,
        match,
      };
    } catch (err) {
      try {
        await this.meter?.release(reservation);
      } catch (releaseError) {
        this.logger.warn(
          `Could not release preparation reservation: ${releaseError instanceof Error ? releaseError.message : 'unknown'}`,
          'TailorResumeForJobUseCase',
        );
      }
      throw err;
    }
  }

  private async loadOwnedResume(resumeId: string, userId: string): Promise<ResumeForTailor> {
    const resume = await this.repository.findResumeForTailor(resumeId);
    if (!resume) throw new ResumeNotFoundException();
    if (resume.userId !== userId) throw new ResumeNotOwnedException();
    return resume;
  }

  private async resolveJob(input: TailorJobInput): Promise<ResolvedTailorJob> {
    if (input.jobId) {
      const internal = await this.repository.findJobById(input.jobId);
      if (internal) return { job: internal, internalJobId: input.jobId, externalJobId: null };

      const external = await this.repository.findExternalJobById(input.jobId);
      if (external) return { job: external, internalJobId: null, externalJobId: input.jobId };

      throw new EntityNotFoundException('Job', input.jobId);
    }

    if (!input.jobDescription || input.jobDescription.trim().length < 10) {
      throw new ResumeTailorInputRequiredException();
    }

    return {
      job: {
        title: input.jobTitle ?? 'Target role',
        company: input.jobCompany ?? 'Unknown company',
        description: input.jobDescription,
        requirements: [],
        skills: [],
      },
      internalJobId: null,
      externalJobId: null,
    };
  }

  /** Compatibility before/after — null without a resolvable job target or
   * when the match engine is unavailable (never blocks the tailor). */
  private async estimateMatch(
    input: TailorJobInput,
    resolved: ResolvedTailorJob,
    bullets: ReadonlyArray<{ highlights: string[] }>,
  ): Promise<TailorMatchEstimate | null> {
    const jobId = resolved.internalJobId ?? resolved.externalJobId;
    if (!jobId || !this.match) return null;

    const breakdown = await this.match.computeForJob(input.userId, input.resumeId, jobId);
    if (!breakdown) return null;

    const injected = bullets.flatMap((bullet) => bullet.highlights);
    return estimateTailoredMatch(breakdown, injected);
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

function detectJobLocale(description: string, title: string): 'pt-BR' | 'en' | null {
  const text = ` ${description} ${title} `.toLowerCase();
  const words = text.match(/[a-zà-ÿ]+/gu) ?? [];
  const pt = new Set([
    'para',
    'com',
    'experiência',
    'conhecimento',
    'vaga',
    'requisitos',
    'trabalho',
    'equipe',
  ]);
  const en = new Set([
    'with',
    'experience',
    'requirements',
    'role',
    'team',
    'work',
    'skills',
    'you',
  ]);
  const ptCount = words.filter((word) => pt.has(word)).length;
  const enCount = words.filter((word) => en.has(word)).length;
  if (Math.max(ptCount, enCount) < 2 || Math.abs(ptCount - enCount) < 2) return null;
  return ptCount > enCount ? 'pt-BR' : 'en';
}
