/**
 * Resume Test Factory
 * Creates mock Resume objects for testing with proper types
 */

import { Prisma, Resume, ResumeTemplate } from '@prisma/client';

export interface CreateMockResumeOptions {
  id?: string;
  userId?: string;
  title?: string;
  slug?: string;
  isPublic?: boolean;
  template?: ResumeTemplate;
  language?: string;
  primaryLanguage?: string;
  contentPtBr?: Prisma.JsonValue;
  contentEn?: Prisma.JsonValue;
  techPersona?: string | null;
  techArea?: string | null;
  primaryStack?: string[];
  experienceYears?: number | null;
  fullName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  emailContact?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  summary?: string | null;
  currentCompanyLogo?: string | null;
  twitter?: string | null;
  medium?: string | null;
  devto?: string | null;
  stackoverflow?: string | null;
  kaggle?: string | null;
  hackerrank?: string | null;
  leetcode?: string | null;
  accentColor?: string | null;
  customTheme?: Prisma.JsonValue;
  activeThemeId?: string | null;
  profileViews?: number;
  totalStars?: number;
  totalCommits?: number;
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const defaultResume: Resume = {
  id: 'resume-123',
  userId: 'user-123',
  title: 'My Resume',
  slug: 'my-resume',
  isPublic: false,
  template: 'PROFESSIONAL',
  language: 'pt-br',
  primaryLanguage: 'pt-br',
  contentPtBr: null,
  contentEn: null,
  techPersona: null,
  techArea: null,
  primaryStack: [],
  experienceYears: null,
  fullName: null,
  jobTitle: null,
  phone: null,
  emailContact: null,
  location: null,
  linkedin: null,
  github: null,
  website: null,
  summary: null,
  currentCompanyLogo: null,
  twitter: null,
  medium: null,
  devto: null,
  stackoverflow: null,
  kaggle: null,
  hackerrank: null,
  leetcode: null,
  accentColor: '#3B82F6',
  customTheme: null,
  activeThemeId: null,
  profileViews: 0,
  totalStars: 0,
  totalCommits: 0,
  publishedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export function createMockResume(
  options: CreateMockResumeOptions = {},
): Resume {
  const result: Resume = {
    ...defaultResume,
    ...options,
    createdAt: options.createdAt ?? defaultResume.createdAt,
    updatedAt: options.updatedAt ?? defaultResume.updatedAt,
  };
  return result;
}

export function createMockPublicResume(
  options: CreateMockResumeOptions = {},
): Resume {
  return createMockResume({
    ...options,
    isPublic: true,
    publishedAt: new Date(),
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
  const {
    skills,
    experiences,
    educations,
    projects,
    languages,
    certifications,
    ...resumeOptions
  } = options;
  return {
    ...createMockResume(resumeOptions as CreateMockResumeOptions),
    skills: skills ?? [],
    experiences: experiences ?? [],
    educations: educations ?? [],
    projects: projects ?? [],
    languages: languages ?? [],
    certifications: certifications ?? [],
  };
}
