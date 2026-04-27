/**
 * Outbound persistence port for the resume-versions BC.
 *
 * Covers both surfaces this BC owns:
 *  - Versioning: snapshot create / list / restore / cleanup.
 *  - Tailoring: load owned resume + sections, resolve target jobs,
 *    persist tailored versions, list/diff them.
 *
 * Use cases depend on this abstract class — never on Prisma directly.
 */

import type {
  ResumeForSnapshot,
  ResumeVersionListItem,
  ResumeVersionRecord,
} from '../entities/resume-version';
import type {
  JobForTailor,
  ResumeForTailor,
  TailoredVersionSummary,
} from '../entities/tailor';

export abstract class ResumeVersionsRepositoryPort {
  // -------- Versioning --------
  abstract findResumeForSnapshot(resumeId: string): Promise<ResumeForSnapshot | null>;

  abstract findLastVersionNumber(resumeId: string): Promise<number | null>;

  abstract createResumeVersion(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: Record<string, unknown>;
    label?: string;
    isTailored?: boolean;
    tailoredJobId?: string | null;
  }): Promise<ResumeVersionRecord>;

  abstract findResumeOwner(resumeId: string): Promise<{ userId: string } | null>;

  abstract findResumeVersions(resumeId: string): Promise<ResumeVersionListItem[]>;

  abstract findResumeVersionById(versionId: string): Promise<ResumeVersionRecord | null>;

  abstract updateResumeFromSnapshot(
    resumeId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void>;

  abstract findVersionIdsByResumeIdDesc(resumeId: string): Promise<string[]>;

  abstract deleteVersionsByIds(ids: string[]): Promise<void>;

  // -------- Tailor --------
  abstract findResumeForTailor(resumeId: string): Promise<ResumeForTailor | null>;

  abstract findJobById(jobId: string): Promise<JobForTailor | null>;

  abstract findTailoredVersions(resumeId: string): Promise<TailoredVersionSummary[]>;
}
