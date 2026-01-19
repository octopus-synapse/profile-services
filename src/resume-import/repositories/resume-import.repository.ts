/**
 * Resume Import Repository
 * Data access layer for resume import operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ResumeImport,
  Prisma,
  ImportSource,
  ImportStatus,
} from '@prisma/client';

@Injectable()
export class ResumeImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new import job
   */
  async create(data: {
    userId: string;
    source: ImportSource;
    status: ImportStatus;
    rawData: Prisma.InputJsonValue;
    fileName?: string;
  }): Promise<ResumeImport> {
    return this.prisma.resumeImport.create({ data });
  }

  /**
   * Find an import job by ID
   */
  async findById(importId: string): Promise<ResumeImport | null> {
    return this.prisma.resumeImport.findUnique({
      where: { id: importId },
    });
  }

  /**
   * Update import status
   */
  async updateStatus(
    importId: string,
    status: ImportStatus,
    errorMessage?: string,
    resumeId?: string,
  ): Promise<void> {
    await this.prisma.resumeImport.update({
      where: { id: importId },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        resumeId,
        completedAt:
          status === 'COMPLETED' || status === 'FAILED'
            ? new Date()
            : undefined,
      },
    });
  }

  /**
   * Find all import jobs for a user
   */
  async findAllByUserId(userId: string): Promise<ResumeImport[]> {
    return this.prisma.resumeImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete an import job by ID
   */
  async delete(importId: string): Promise<void> {
    await this.prisma.resumeImport.delete({
      where: { id: importId },
    });
  }

  /**
   * Create a resume from imported data
   */
  async createResume(data: {
    userId: string;
    title: string;
    summary?: string;
    importId: string;
  }): Promise<{ id: string }> {
    return this.prisma.resume.create({
      data: {
        userId: data.userId,
        title: data.title,
        summary: data.summary,
        import: {
          connect: { id: data.importId },
        },
      },
    });
  }
}
