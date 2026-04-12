/**
 * Import Domain Types
 *
 * Framework-agnostic type definitions for the import bounded context.
 * No @prisma/client or NestJS imports allowed.
 */

export type ImportSource = 'LINKEDIN' | 'PDF' | 'DOCX' | 'JSON' | 'GITHUB';

export type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'MAPPING'
  | 'VALIDATING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

export interface ParsedSection {
  sectionTypeKey: string;
  items: Array<Record<string, unknown>>;
}

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

export interface ParsedResumeData {
  personalInfo: PersonalInfo;
  summary?: string;
  sections: ParsedSection[];
}

export interface JsonResumeSchema {
  basics?: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: {
      city?: string;
      countryCode?: string;
      region?: string;
    };
    profiles?: Array<{
      network?: string;
      url?: string;
      username?: string;
    }>;
  };
  work?: Array<{
    name?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
  }>;
  skills?: Array<{
    name?: string;
    level?: string;
    keywords?: string[];
  }>;
  languages?: Array<{
    language?: string;
    fluency?: string;
  }>;
  certificates?: Array<{
    name?: string;
    date?: string;
    issuer?: string;
    url?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    url?: string;
    keywords?: string[];
  }>;
}

export interface ImportJobData {
  id: string;
  userId: string;
  source: ImportSource;
  status: ImportStatus;
  fileUrl: string | null;
  fileName: string | null;
  rawData: unknown;
  mappedData: unknown;
  errors: string[];
  errorMessage: string | null;
  resumeId: string | null;
  metadata: Record<string, unknown> | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface CreateImportJobParams {
  userId: string;
  source: ImportSource;
  rawData?: unknown;
  fileName?: string;
}

export interface ImportResult {
  importId: string;
  status: ImportStatus;
  resumeId?: string;
  errors?: string[];
}
