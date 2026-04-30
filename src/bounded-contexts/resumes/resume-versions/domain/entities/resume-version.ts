/**
 * Domain entities for the resume-versions bounded context.
 *
 * These are pure POJO shapes the use cases pass between repository and
 * application services. No Prisma / Nest / Express coupling here.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export type ResumeSectionItem = { content: JsonValue };

export type ResumeSectionForSnapshot = {
  sectionType: { semanticKind: string | null };
  items: ResumeSectionItem[];
};

export type ResumeForSnapshot = {
  userId: string;
  resumeSections: ResumeSectionForSnapshot[];
};

export type ResumeVersionListItem = {
  id: string;
  versionNumber: number;
  label: string | null;
  createdAt: Date;
};

export type ResumeVersionRecord = {
  id: string;
  resumeId: string;
  versionNumber: number;
  snapshot: JsonValue;
  label: string | null;
  createdAt: Date;
};

export type VersionRestoreResult = { restoredFrom: Date };
