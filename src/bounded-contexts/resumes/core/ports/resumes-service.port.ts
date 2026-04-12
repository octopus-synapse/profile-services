/**
 * Resumes Service Port
 *
 * Abstract port for ResumesService - enables dependency inversion.
 * Controllers depend on this abstraction, allowing proper testing without type assertions.
 */

import type { CreateResume, UpdateResume } from '@/shared-kernel';

export type UserResumesPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type UserResumesPaginatedResult = {
  resumes: ResumeResult[];
  pagination: UserResumesPagination;
};

export type ResumeSlots = {
  used: number;
  limit: number;
  remaining: number;
};

export type ResumeResult = {
  id: string;
  userId: string;
  title: string | null;
  language?: string | null;
  targetRole?: string | null;
  template?: string | null;
  isPublic?: boolean;
  slug?: string | null;
  createdAt: Date;
  updatedAt: Date;
  activeThemeId?: string | null;
  activeTheme?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  resumeSections?: Array<{
    id: string;
    order: number;
    visible?: boolean;
    sectionType: {
      id: string;
      key: string;
      semanticKind?: string | null;
      title?: string | null;
      version?: number | null;
    };
    items: Array<{
      id: string;
      order: number;
      content?: Record<string, unknown> | null;
    }>;
  }>;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
};

export abstract class ResumesServicePort {
  abstract findAllUserResumes(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<ResumeResult[] | UserResumesPaginatedResult>;

  abstract findResumeByIdForUser(id: string, userId: string): Promise<ResumeResult>;

  abstract getRemainingSlots(userId: string): Promise<ResumeSlots>;

  abstract createResumeForUser(userId: string, data: CreateResume): Promise<ResumeResult>;

  abstract updateResumeForUser(
    id: string,
    userId: string,
    data: UpdateResume,
  ): Promise<ResumeResult>;

  abstract deleteResumeForUser(id: string, userId: string): Promise<void>;
}
