/**
 * Compute the structured diff for a tailored resume version. The data
 * is read out of the persisted snapshot ("master" vs. "tailored")
 * rather than recomputed against the live master, so an old diff stays
 * stable even if the master moves on.
 */

import {
  ResumeNotFoundException,
  ResumeNotOwnedException,
  ResumeVersionNotFoundException,
} from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import type { TailoredVersionDiff } from '../../../domain/entities/tailor';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';

type SnapshotEnvelope = {
  master?: {
    summary?: string | null;
    jobTitle?: string | null;
    bullets?: Array<{ id: string; content: string }>;
  };
  tailored?: {
    summary?: string | null;
    jobTitle?: string | null;
    bullets?: Array<{ id: string; original: string; tailored: string; highlights?: string[] }>;
  };
};

export class GetTailoredVersionDiffUseCase {
  constructor(private readonly repository: ResumeVersionsRepositoryPort) {}

  async execute(resumeId: string, versionId: string, userId: string): Promise<TailoredVersionDiff> {
    const owner = await this.repository.findResumeOwner(resumeId);
    if (!owner) throw new ResumeNotFoundException();
    if (owner.userId !== userId) throw new ResumeNotOwnedException();

    const version = await this.repository.findResumeVersionById(versionId);
    if (!version || version.resumeId !== resumeId) {
      throw new ResumeVersionNotFoundException(versionId);
    }

    const snap = version.snapshot as SnapshotEnvelope;
    const master = snap.master ?? {};
    const tailored = snap.tailored ?? {};

    return {
      versionId: version.id,
      summary:
        tailored.summary !== undefined && tailored.summary !== null
          ? { before: master.summary ?? null, after: tailored.summary }
          : null,
      jobTitle:
        tailored.jobTitle !== undefined && tailored.jobTitle !== null
          ? { before: master.jobTitle ?? null, after: tailored.jobTitle }
          : null,
      bullets: (tailored.bullets ?? []).map((b) => ({
        id: b.id,
        before: b.original,
        after: b.tailored,
        highlights: b.highlights ?? [],
      })),
    };
  }
}
