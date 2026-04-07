/**
 * Resume Data Repository Port
 *
 * Abstraction for reading resume data needed by export use cases.
 * Implemented by infrastructure adapters (e.g., Prisma).
 */

// ============================================================================
// Domain Types
// ============================================================================

export type GenericSectionContent = Record<string, unknown>;

export type GenericSection = {
  semanticKind: string;
  items: Array<{ content: GenericSectionContent }>;
};

export type GenericSectionWithMeta = {
  semanticKind: string;
  sectionTypeKey: string;
  title: string;
  items: GenericSectionContent[];
};

export type ResumeForJsonExport = {
  id: string;
  title: string | null;
  slug: string | null;
  summary: string | null;
  jobTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  sections: GenericSection[];
};

export type ResumeForLatexExport = {
  title: string | null;
  fullName: string | null;
  emailContact: string | null;
  phone: string | null;
  jobTitle: string | null;
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  sections: GenericSectionWithMeta[];
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class ResumeDataRepositoryPort {
  abstract findForJsonExport(resumeId: string): Promise<ResumeForJsonExport | null>;
  abstract findForLatexExport(resumeId: string): Promise<ResumeForLatexExport | null>;
}
