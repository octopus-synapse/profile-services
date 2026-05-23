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
import type { JobForTailor, ResumeForTailor, TailoredVersionSummary } from '../entities/tailor';

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

  /**
   * Race-safe create — allocates the next `versionNumber` and inserts
   * atomically, retrying on the
   * `@@unique([resumeId, versionNumber])` violation that loses the race
   * to a concurrent caller. Use this from snapshot + tailor flows
   * where two requests can fire for the same resume; the legacy
   * `createResumeVersion(... versionNumber)` is preserved only for
   * tests and internal cleanup paths that already control allocation.
   */
  abstract createNextResumeVersion(
    resumeId: string,
    data: {
      snapshot: Record<string, unknown>;
      label?: string;
      isTailored?: boolean;
      tailoredJobId?: string | null;
    },
  ): Promise<ResumeVersionRecord>;

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
