/**
 * Export Repository
 * Low-level persistence operations for Resume export features.
 *
 * Responsibility: All Prisma operations for export functionality.
 * Dependencies point inward: Repository depends only on PrismaService.
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// --- Types ---

export type ResumeWithRelations = Prisma.ResumeGetPayload<{
  include: {
    user: true;
    experiences: true;
    education: true;
    skills: true;
  };
}>;

export type ResumeWithFullRelations = Prisma.ResumeGetPayload<{
  include: {
    user: true;
    experiences: true;
    education: true;
    skills: true;
    languages: true;
    openSource: true;
    certifications: true;
  };
}>;

// --- Repository ---

@Injectable()
export class ExportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find resume with relations needed for LaTeX export.
   */
  async findResumeForLatexExport(
    resumeId: string,
  ): Promise<ResumeWithRelations | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: true,
      },
    });
  }

  /**
   * Find resume with all relations needed for JSON export.
   */
  async findResumeForJsonExport(
    resumeId: string,
  ): Promise<ResumeWithFullRelations | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
        experiences: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: true,
        languages: true,
        openSource: true,
        certifications: true,
      },
    });
  }
}
