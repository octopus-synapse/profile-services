/**
 * Resume Version Port
 *
 * Defines domain types and repository abstraction for resume versioning.
 * NO infrastructure dependencies allowed here.
 */

// ============================================================================
// Domain Types (Pure TypeScript - No Prisma)
// ============================================================================

export type ResumeVersionListItem = {
  id: string;
  versionNumber: number;
  label: string | null;
  createdAt: Date;
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type ResumeSectionItem = {
  content: JsonValue;
};

export type ResumeSectionForSnapshot = {
  sectionType: {
    semanticKind: string | null;
  };
  items: ResumeSectionItem[];
};

export type ResumeForSnapshot = {
  userId: string;
  resumeSections: ResumeSectionForSnapshot[];
};

export type ResumeVersionRecord = {
  id: string;
  resumeId: string;
  versionNumber: number;
  snapshot: JsonValue;
  label: string | null;
  createdAt: Date;
};

export type VersionRestoreResult = {
  restoredFrom: Date;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class ResumeVersionRepositoryPort {
  abstract findResumeForSnapshot(resumeId: string): Promise<ResumeForSnapshot | null>;

  abstract findLastVersionNumber(resumeId: string): Promise<number | null>;

  abstract createResumeVersion(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: Record<string, unknown>;
    label?: string;
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
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const RESUME_VERSION_USE_CASES = Symbol('RESUME_VERSION_USE_CASES');

export interface ResumeVersionUseCases {
  createSnapshotUseCase: {
    execute: (resumeId: string, label?: string) => Promise<ResumeVersionRecord>;
  };
  getVersionsUseCase: {
    execute: (resumeId: string, userId: string) => Promise<ResumeVersionListItem[]>;
  };
  restoreVersionUseCase: {
    execute: (resumeId: string, versionId: string, userId: string) => Promise<VersionRestoreResult>;
  };
}
