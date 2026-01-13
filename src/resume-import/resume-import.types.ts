/**
 * Resume Import Types
 *
 * Type definitions for resume import functionality.
 *
 * Uncle Bob: "Types are contracts - they document intent"
 */

import type { ImportSource, ImportStatus } from '@prisma/client';

/**
 * Parsed resume data from any source
 */
export interface ParsedResumeData {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  summary?: string;
  experiences: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    description?: string;
    highlights?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
    url?: string;
  }>;
  languages?: Array<{
    name: string;
    level?: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    url?: string;
    technologies?: string[];
  }>;
}

/**
 * Import job creation params
 */
export interface CreateImportParams {
  userId: string;
  source: ImportSource;
  fileUrl?: string;
  fileName?: string;
  rawData?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Import job result
 */
export interface ImportResult {
  importId: string;
  status: ImportStatus;
  resumeId?: string;
  errors?: string[];
}

/**
 * Import status update
 */
export interface ImportStatusUpdate {
  status: ImportStatus;
  errors?: string[];
  mappedData?: ParsedResumeData;
  resumeId?: string;
}

/**
 * JSON Resume schema (jsonresume.org)
 */
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

/**
 * Import job with expanded data
 */
export interface ResumeImportWithDetails {
  id: string;
  userId: string;
  source: ImportSource;
  status: ImportStatus;
  fileUrl: string | null;
  fileName: string | null;
  rawData: unknown | null;
  mappedData: ParsedResumeData | null;
  errors: string[];
  resumeId: string | null;
  metadata: Record<string, unknown> | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}
