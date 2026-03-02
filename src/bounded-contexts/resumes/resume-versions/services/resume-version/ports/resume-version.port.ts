import type { Prisma } from '@prisma/client';

export type ResumeVersionListItem = Prisma.ResumeVersionGetPayload<{
  select: {
    id: true;
    versionNumber: true;
    label: true;
    createdAt: true;
  };
}>;

export type ResumeForSnapshot = Prisma.ResumeGetPayload<{
  include: {
    resumeSections: {
      include: {
        sectionType: {
          select: {
            semanticKind: true;
          };
        };
        items: {
          select: {
            content: true;
          };
        };
      };
    };
  };
}>;

export type ResumeVersionRecord = Prisma.ResumeVersionGetPayload<{
  select: {
    id: true;
    resumeId: true;
    versionNumber: true;
    snapshot: true;
    label: true;
    createdAt: true;
  };
}>;

export type VersionRestoreResult = {
  restoredFrom: Date;
};

export abstract class ResumeVersionRepositoryPort {
  abstract findResumeForSnapshot(resumeId: string): Promise<ResumeForSnapshot | null>;

  abstract findLastVersionNumber(resumeId: string): Promise<number | null>;

  abstract createResumeVersion(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: Prisma.InputJsonValue;
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
