/**
 * Tailor-specific domain shapes — what the LLM emits, what the diff
 * endpoint returns, and the persisted snapshot envelope.
 */

export type TailorBullet = {
  id: string;
  original: string;
  tailored: string;
  highlights: string[];
};

export type TailorResumeResult = {
  versionId: string;
  versionNumber: number;
  label: string;
  summary: string | null;
  jobTitle: string | null;
  bullets: TailorBullet[];
};

export type TailoredVersionDiff = {
  versionId: string;
  summary: { before: string | null; after: string | null } | null;
  jobTitle: { before: string | null; after: string | null } | null;
  bullets: Array<{ id: string; before: string; after: string; highlights: string[] }>;
};

export type TailoredVersionSummary = {
  id: string;
  versionNumber: number;
  label: string | null;
  createdAt: Date;
  tailoredJobId: string | null;
  /** Title/company of the tailored-for job (null when the job was deleted). */
  tailoredJobTitle: string | null;
  tailoredJobCompany: string | null;
};

/**
 * Resume read shape used by the tailor — wider than the snapshot view because
 * the LLM input requires per-item ids the snapshot path discards.
 */
export type ResumeForTailor = {
  id: string;
  userId: string;
  summary: string | null;
  jobTitle: string | null;
  primaryStack: string[];
  resumeSections: Array<{
    sectionType: { key: string; semanticKind: string | null };
    items: Array<{ id: string; content: Record<string, unknown> }>;
  }>;
};

export type JobForTailor = {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  skills: string[];
};

export type TailorJobInput = {
  resumeId: string;
  userId: string;
  jobId?: string;
  jobDescription?: string;
  jobTitle?: string;
  jobCompany?: string;
};

/**
 * Snapshot persisted on a tailored version: keeps both the master state at
 * tailor-time (frozen "before") and the LLM diff ("after") so the UI can
 * render before/after even after the master changes.
 */
export type TailoredSnapshot = {
  master: {
    summary: string | null;
    jobTitle: string | null;
    bullets: Array<{ id: string; content: string }>;
  };
  tailored: {
    summary: string | null;
    jobTitle: string | null;
    bullets: TailorBullet[];
  };
};
