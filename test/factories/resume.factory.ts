/**
 * Resume Test Factory
 * Creates mock Resume objects for testing with proper types
 */

import { Resume, ResumeStatus, AtsOptimization } from '@prisma/client';

export interface CreateMockResumeOptions {
  id?: string;
  userId?: string;
  title?: string;
  slug?: string;
  status?: ResumeStatus;
  isPublic?: boolean;
  themeId?: string | null;
  language?: string | null;
  jobTitle?: string | null;
  summary?: string | null;
  summaryPtBr?: string | null;
  atsOptimization?: AtsOptimization;
  targetRole?: string | null;
  yearsOfExperience?: number | null;
  githubUsername?: string | null;
  githubTotalStars?: number;
  githubLastSyncedAt?: Date | null;
  sectionOrder?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const defaultResume: Resume = {
  id: 'resume-123',
  userId: 'user-123',
  title: 'My Resume',
  slug: 'my-resume',
  status: 'DRAFT',
  isPublic: false,
  themeId: null,
  language: 'en',
  jobTitle: null,
  summary: null,
  summaryPtBr: null,
  atsOptimization: 'BALANCED',
  targetRole: null,
  yearsOfExperience: null,
  githubUsername: null,
  githubTotalStars: 0,
  githubLastSyncedAt: null,
  sectionOrder: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export function createMockResume(
  options: CreateMockResumeOptions = {},
): Resume {
  return {
    ...defaultResume,
    ...options,
    createdAt: options.createdAt ?? defaultResume.createdAt,
    updatedAt: options.updatedAt ?? defaultResume.updatedAt,
  };
}

export function createMockPublicResume(
  options: CreateMockResumeOptions = {},
): Resume {
  return createMockResume({
    ...options,
    isPublic: true,
    status: 'PUBLISHED',
  });
}

/**
 * Resume with all relations included
 */
export interface ResumeWithRelations extends Resume {
  skills?: Array<{
    id: string;
    name: string;
    category: string;
    level: number | null;
    order: number;
  }>;
  experiences?: Array<{
    id: string;
    company: string;
    position: string;
    startDate: Date;
    endDate: Date | null;
    current: boolean;
    description: string | null;
    order: number;
  }>;
  educations?: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string | null;
    startDate: Date;
    endDate: Date | null;
    current: boolean;
    order: number;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    description: string | null;
    url: string | null;
    order: number;
  }>;
  languages?: Array<{
    id: string;
    name: string;
    level: string;
    order: number;
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    date: Date | null;
    order: number;
  }>;
}

export function createMockResumeWithRelations(
  options: Partial<ResumeWithRelations> = {},
): ResumeWithRelations {
  return {
    ...createMockResume(options),
    skills: options.skills ?? [],
    experiences: options.experiences ?? [],
    educations: options.educations ?? [],
    projects: options.projects ?? [],
    languages: options.languages ?? [],
    certifications: options.certifications ?? [],
  };
}
