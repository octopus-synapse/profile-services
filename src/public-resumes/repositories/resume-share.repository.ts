/**
 * Resume Share Repository
 * Data access layer for resume sharing operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ResumeShare, Resume } from '@prisma/client';

interface ResumeWithRelations extends Resume {
  experiences: unknown[];
  education: unknown[];
  skills: unknown[];
  languages: unknown[];
  projects: unknown[];
  certifications: unknown[];
  awards: unknown[];
}

@Injectable()
export class ResumeShareRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new share
   */
  async create(data: {
    resumeId: string;
    slug: string;
    password: string | null;
    expiresAt?: Date;
  }): Promise<ResumeShare> {
    return this.prisma.resumeShare.create({ data });
  }

  /**
   * Find a share by slug
   */
  async findBySlug(slug: string): Promise<ResumeShare | null> {
    return this.prisma.resumeShare.findUnique({ where: { slug } });
  }

  /**
   * Find a share by slug with resume
   */
  async findBySlugWithResume(
    slug: string,
  ): Promise<(ResumeShare & { resume: Resume }) | null> {
    return this.prisma.resumeShare.findUnique({
      where: { slug },
      include: { resume: true },
    });
  }

  /**
   * Find a resume by ID with all relations
   */
  async findResumeWithRelations(
    resumeId: string,
  ): Promise<ResumeWithRelations | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: { orderBy: { order: 'asc' } },
        languages: { orderBy: { order: 'asc' } },
        projects: { orderBy: { startDate: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
        awards: { orderBy: { date: 'desc' } },
      },
    }) as unknown as Promise<ResumeWithRelations | null>;
  }

  /**
   * Delete a share by ID
   */
  async delete(shareId: string): Promise<ResumeShare> {
    return this.prisma.resumeShare.delete({ where: { id: shareId } });
  }

  /**
   * Find all shares for a resume
   */
  async findAllByResumeId(resumeId: string): Promise<ResumeShare[]> {
    return this.prisma.resumeShare.findMany({
      where: { resumeId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
