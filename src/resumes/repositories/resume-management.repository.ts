/**
 * Resume Management Repository
 * Data access layer for resume management operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Resume, User } from '@prisma/client';

export interface ResumeWithRelations extends Resume {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  skills: unknown[];
  experiences: unknown[];
  education: unknown[];
  projects: unknown[];
  certifications: unknown[];
  languages: unknown[];
  awards: unknown[];
}

export interface ResumeWithCounts extends Resume {
  skills: unknown[];
  experiences: unknown[];
  education: unknown[];
  _count: {
    skills: number;
    experiences: number;
    education: number;
    projects: number;
    certifications: number;
  };
}

@Injectable()
export class ResumeManagementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all resumes for a user with counts
   */
  async findAllByUserId(userId: string): Promise<ResumeWithCounts[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      include: {
        skills: true,
        experiences: true,
        education: true,
        _count: {
          select: {
            skills: true,
            experiences: true,
            education: true,
            projects: true,
            certifications: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }) as unknown as Promise<ResumeWithCounts[]>;
  }

  /**
   * Find a resume by ID with all relations
   */
  async findByIdWithRelations(
    resumeId: string,
  ): Promise<ResumeWithRelations | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        skills: { orderBy: { order: 'asc' } },
        experiences: { orderBy: { order: 'asc' } },
        education: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        certifications: { orderBy: { order: 'asc' } },
        languages: { orderBy: { order: 'asc' } },
        awards: { orderBy: { order: 'asc' } },
      },
    }) as unknown as Promise<ResumeWithRelations | null>;
  }

  /**
   * Delete a resume by ID
   */
  async delete(resumeId: string): Promise<void> {
    await this.prisma.resume.delete({ where: { id: resumeId } });
  }

  /**
   * Find a resume by ID (for validation)
   */
  async findById(resumeId: string): Promise<Pick<Resume, 'id'> | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true },
    });
  }

  /**
   * Find a user by ID (for validation)
   */
  async findUserById(userId: string): Promise<Pick<User, 'id'> | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }
}
