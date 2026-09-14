/**
 * DEV-ONLY. Persists a lab run the operator approved as a real tailored
 * `ResumeVersion`, so the rendered preview (`GET /v1/export/resume/preview`,
 * which needs a `versionId`) can show it.
 *
 * Takes the run's output rather than re-running the tailor: a second LLM call
 * costs money and would return different text than the one just approved.
 *
 * The snapshot envelope matches `TailoredSnapshot` exactly — the diff endpoint
 * and the export overlay both read that shape.
 */

import type {
  ResumeForTailor,
  TailorBullet,
} from '@/bounded-contexts/resumes/resume-versions/domain/entities/tailor';
import type { ResumeVersionsRepositoryPort } from '@/bounded-contexts/resumes/resume-versions/domain/ports/resume-versions.repository.port';
import { OwnershipAccessDeniedException } from '@/shared-kernel/authorization';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';

export interface SaveTailorLabRunInput {
  readonly resumeId: string;
  readonly userId: string;
  readonly summary: string | null;
  readonly jobTitle: string | null;
  readonly bullets: TailorBullet[];
  readonly jobId?: string | undefined;
  readonly job: { readonly title: string; readonly company: string };
}

export interface SaveTailorLabRunResult {
  readonly versionId: string;
  readonly versionNumber: number;
  readonly label: string;
}

export class SaveTailorLabRunUseCase {
  constructor(private readonly repository: ResumeVersionsRepositoryPort) {}

  async execute(input: SaveTailorLabRunInput): Promise<SaveTailorLabRunResult> {
    const resume = await this.loadOwnedResume(input.resumeId, input.userId);
    const label = labelFor(input.job);

    // The lab only ever targets internal jobs from the seeded dropdown; a
    // pasted description has no id at all. Resolving which column an id
    // belongs to would mean a second lookup for no gain here, so both stay
    // null and the title/company snapshot carries the provenance.
    const created = await this.repository.createNextResumeVersion(resume.id, {
      snapshot: {
        master: {
          summary: resume.summary,
          jobTitle: resume.jobTitle,
          bullets: flattenBullets(resume),
        },
        tailored: {
          summary: input.summary,
          jobTitle: input.jobTitle,
          bullets: input.bullets,
        },
      },
      label,
      isTailored: true,
      tailoredJobId: null,
      tailoredExternalJobId: null,
      tailoredJobTitleSnapshot: input.job.title,
      tailoredJobCompanySnapshot: input.job.company,
    });

    return {
      versionId: created.id,
      versionNumber: created.versionNumber,
      label: created.label ?? label,
    };
  }

  private async loadOwnedResume(resumeId: string, userId: string): Promise<ResumeForTailor> {
    const resume = await this.repository.findResumeForTailor(resumeId);
    if (!resume) throw new EntityNotFoundException('Resume', resumeId);
    if (resume.userId !== userId) throw new OwnershipAccessDeniedException();
    return resume;
  }
}

/** Mirrors the production use case's `flattenBullets`. */
function flattenBullets(resume: ResumeForTailor): Array<{ id: string; content: string }> {
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

/** Prefixed so lab-made versions are recognisable in the version history. */
function labelFor(job: { title: string; company: string }): string {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  return `[lab] Tailored for ${clean(job.company)} — ${clean(job.title)}`.slice(0, 180);
}
