/**
 * DEV-ONLY. Runs the tailor prompt against a real resume + job and returns
 * the result WITHOUT persisting a ResumeVersion.
 *
 * Deliberately does not reuse `TailorResumeForJobUseCase`:
 *  - that use case always writes a version (`versionId` is non-nullable in its
 *    domain result, so a `dryRun` flag would leak nullable fields into the
 *    production response schema and the generated SDK);
 *  - it wraps every LLM failure in `TailorEngineUnavailableException` (503),
 *    which is exactly the detail the lab exists to show — schema violations,
 *    `finish_reason: 'length'`, a provider 400 about an unsupported
 *    temperature. Here the original error propagates untouched.
 *
 * The resume→payload mapping mirrors `tailor-resume-for-job.use-case.ts`
 * (loadOwnedResume / resolveJob / sections map). Keep the two in sync — the
 * lab is only useful while it sends what production sends.
 */

import type {
  TailorLabLlmPort,
  TailorResumeDebug,
  TailorResumeOverrides,
} from '@/bounded-contexts/ai/domain/ports/tailor-lab-llm.port';
import type {
  JobForTailor,
  ResumeForTailor,
  TailorBullet,
} from '@/bounded-contexts/resumes/resume-versions/domain/entities/tailor';
import type { ResumeVersionsRepositoryPort } from '@/bounded-contexts/resumes/resume-versions/domain/ports/resume-versions.repository.port';
import { OwnershipAccessDeniedException } from '@/shared-kernel/authorization';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';

export interface RunTailorLabInput {
  readonly resumeId: string;
  readonly userId: string;
  readonly jobId?: string | undefined;
  readonly jobDescription?: string | undefined;
  readonly jobTitle?: string | undefined;
  readonly jobCompany?: string | undefined;
  readonly overrides: TailorResumeOverrides;
}

/** JSON-Patch-like shape, mirroring the production tailor route's `changes[]`. */
export interface TailorLabChange {
  readonly path: ReadonlyArray<string | number>;
  readonly op: 'add' | 'remove' | 'replace';
  readonly before?: unknown;
  readonly after?: unknown;
  readonly highlights?: readonly string[];
}

export interface RunTailorLabResult {
  readonly summary: string | null;
  readonly jobTitle: string | null;
  readonly bullets: TailorBullet[];
  readonly changes: TailorLabChange[];
  /** The job exactly as it was handed to the prompt. */
  readonly job: JobForTailor;
  readonly debug: TailorResumeDebug;
}

export class RunTailorLabUseCase {
  constructor(
    private readonly repository: ResumeVersionsRepositoryPort,
    private readonly llm: TailorLabLlmPort,
  ) {}

  async execute(input: RunTailorLabInput): Promise<RunTailorLabResult> {
    const resume = await this.loadOwnedResume(input.resumeId, input.userId);
    const job = await this.resolveJob(input);

    const { output, debug } = await this.llm.tailorResumeDebug(
      {
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
      },
      input.overrides,
    );

    return {
      summary: output.summary,
      jobTitle: output.jobTitle,
      bullets: output.bullets,
      changes: toChanges(output),
      job,
      debug,
    };
  }

  private async loadOwnedResume(resumeId: string, userId: string): Promise<ResumeForTailor> {
    const resume = await this.repository.findResumeForTailor(resumeId);
    if (!resume) throw new EntityNotFoundException('Resume', resumeId);
    if (resume.userId !== userId) throw new OwnershipAccessDeniedException();
    return resume;
  }

  /**
   * `jobId` resolves internal `Job` first, then the `ExternalJobListing`
   * mirror — same order as production. Without an id, the pasted description
   * becomes the job (requirements/skills empty, as production does).
   */
  private async resolveJob(input: RunTailorLabInput): Promise<JobForTailor> {
    if (input.jobId) {
      const internal = await this.repository.findJobById(input.jobId);
      if (internal) return internal;
      const external = await this.repository.findExternalJobById(input.jobId);
      if (external) return external;
      throw new EntityNotFoundException('Job', input.jobId);
    }

    return {
      title: input.jobTitle ?? 'Target role',
      company: input.jobCompany ?? 'Unknown company',
      description: input.jobDescription ?? '',
      requirements: [],
      skills: [],
    };
  }
}

/**
 * Duplicated on purpose from the production handler
 * (`resume-versions.routes.ts`) so the lab renders an identical diff panel
 * without reshaping a production route around a dev tool.
 */
function toChanges(output: {
  summary: string | null;
  jobTitle: string | null;
  bullets: TailorBullet[];
}): TailorLabChange[] {
  const changes: TailorLabChange[] = [];
  if (typeof output.summary === 'string') {
    changes.push({ path: ['summary'], op: 'replace', after: output.summary });
  }
  if (typeof output.jobTitle === 'string') {
    changes.push({ path: ['jobTitle'], op: 'replace', after: output.jobTitle });
  }
  output.bullets.forEach((bullet, index) => {
    changes.push({
      path: ['bullets', index],
      op: bullet.original ? 'replace' : 'add',
      before: bullet.original || undefined,
      after: bullet.tailored,
      highlights: bullet.highlights ?? [],
    });
  });
  return changes;
}
