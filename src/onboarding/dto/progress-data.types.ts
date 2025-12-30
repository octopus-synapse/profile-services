/**
 * Progress Data Types
 * Partial data types for onboarding progress tracking
 * These types are designed to be JSON-compatible for Prisma storage
 */

import type { Prisma } from '@prisma/client';

export type PartialPersonalInfo = Prisma.InputJsonValue & {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
};

export type PartialProfessionalProfile = Prisma.InputJsonValue & {
  jobTitle?: string;
  summary?: string;
  linkedin?: string;
  github?: string;
  website?: string;
};

export type PartialExperience = Prisma.InputJsonValue & {
  id?: string;
  company?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  location?: string;
};

export type PartialEducation = Prisma.InputJsonValue & {
  id?: string;
  institution?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
};

export type PartialSkill = Prisma.InputJsonValue & {
  id?: string;
  name?: string;
  category?: string;
  level?: number;
};

export type PartialLanguage = Prisma.InputJsonValue & {
  id?: string;
  name?: string;
  level?: string;
};

export type PartialTemplateSelection = Prisma.InputJsonValue & {
  template?: string;
  palette?: string;
};
