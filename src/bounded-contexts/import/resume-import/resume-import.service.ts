/**
 * Resume Import Service
 *
 * Handles resume import from JSON Resume format.
 * MVP: JSON import only. PDF/LinkedIn parsing planned for future.
 *
 * Robert C. Martin: "Single Responsibility"
 * - Parsing: converts external formats to internal structure
 * - Processing: orchestrates import workflow
 * - Persistence: delegates to Prisma
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ResumeImport } from '@prisma/client';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  CreateImportParams,
  ImportResult,
  JsonResumeSchema,
  ParsedResumeData,
} from './resume-import.types';

/**
 * Import status values (mirroring Prisma enum)
 */
type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'MAPPING'
  | 'VALIDATING'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

@Injectable()
export class ResumeImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Create a new import job
   */
  async createImportJob(params: CreateImportParams): Promise<ResumeImport> {
    const { userId, source, rawData, fileName } = params;

    this.logger.log(`Creating import job for user ${userId}, source: ${source}`);

    return this.prisma.resumeImport.create({
      data: {
        userId,
        source,
        status: 'PENDING',
        rawData: rawData as Prisma.InputJsonValue,
        fileName,
      },
    });
  }

  /**
   * Parse JSON Resume format to internal structure
   */
  parseJsonResume(jsonResume: JsonResumeSchema): ParsedResumeData {
    const basics = jsonResume.basics ?? {};
    const work = jsonResume.work ?? [];
    const education = jsonResume.education ?? [];
    const skills = jsonResume.skills ?? [];

    // Extract LinkedIn profile URL
    const linkedinProfile = basics.profiles?.find((p) => p.network?.toLowerCase() === 'linkedin');

    // Flatten skills from nested structure
    const flattenedSkills: string[] = [];
    for (const skillGroup of skills) {
      if (skillGroup.name) {
        flattenedSkills.push(skillGroup.name);
      }
      if (skillGroup.keywords) {
        flattenedSkills.push(...skillGroup.keywords);
      }
    }

    return {
      personalInfo: {
        name: basics.name ?? '',
        email: basics.email,
        phone: basics.phone,
        location: basics.location
          ? `${basics.location.city ?? ''}${basics.location.region ? `, ${basics.location.region}` : ''}`
          : undefined,
        linkedin: linkedinProfile?.url,
        website: basics.url,
      },
      summary: basics.summary,
      experiences: work.map((w) => ({
        title: w.position ?? '',
        company: w.name ?? '',
        startDate: w.startDate ?? '',
        endDate: w.endDate,
        description: w.summary,
        highlights: w.highlights,
      })),
      education: education.map((e) => ({
        degree: e.studyType ?? '',
        institution: e.institution ?? '',
        startDate: e.startDate,
        endDate: e.endDate,
      })),
      skills: flattenedSkills,
      certifications:
        jsonResume.certificates?.map((c) => ({
          name: c.name ?? '',
          issuer: c.issuer,
          date: c.date,
          url: c.url,
        })) ?? [],
      languages:
        jsonResume.languages?.map((l) => ({
          name: l.language ?? '',
          level: l.fluency,
        })) ?? [],
      projects:
        jsonResume.projects?.map((p) => ({
          name: p.name ?? '',
          description: p.description,
          url: p.url,
          technologies: p.keywords,
        })) ?? [],
    };
  }

  /**
   * Process an import job
   */
  async processImport(importId: string): Promise<ImportResult> {
    const importJob = await this.prisma.resumeImport.findUnique({
      where: { id: importId },
    });

    if (!importJob) {
      throw new NotFoundException('Import not found');
    }

    try {
      // Update status to PROCESSING
      await this.updateStatus(importId, 'PROCESSING');

      // Validate raw data exists
      if (!importJob.rawData) {
        await this.updateStatus(importId, 'FAILED', 'No data to import');
        return {
          importId,
          status: 'FAILED',
          errors: ['No data to import'],
        };
      }

      // Parse the JSON Resume
      await this.updateStatus(importId, 'MAPPING');
      const parsedData = this.parseJsonResume(importJob.rawData as unknown as JsonResumeSchema);

      // Validate parsed data
      await this.updateStatus(importId, 'VALIDATING');
      const validationErrors = this.validateParsedData(parsedData);
      if (validationErrors.length > 0) {
        await this.updateStatus(importId, 'FAILED', validationErrors.join('; '));
        return {
          importId,
          status: 'FAILED',
          errors: validationErrors,
        };
      }

      // Create resume
      await this.updateStatus(importId, 'IMPORTING');
      const resume = await this.createResumeFromParsed(importJob.userId, parsedData, importId);

      // Mark as completed
      await this.updateStatus(importId, 'COMPLETED', undefined, resume.id);

      this.logger.log(`Import ${importId} completed successfully, resume: ${resume.id}`);

      return {
        importId,
        status: 'COMPLETED',
        resumeId: resume.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Import ${importId} failed: ${errorMessage}`);
      await this.updateStatus(importId, 'FAILED', errorMessage);
      return {
        importId,
        status: 'FAILED',
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get import status
   */
  async getImportStatus(importId: string): Promise<{
    status: ImportStatus;
    resumeId?: string;
    errorMessage?: string | null;
  }> {
    const importJob = await this.prisma.resumeImport.findUnique({
      where: { id: importId },
    });

    if (!importJob) {
      throw new NotFoundException('Import not found');
    }

    return {
      status: importJob.status as ImportStatus,
      resumeId: importJob.resumeId ?? undefined,
      errorMessage: importJob.errorMessage,
    };
  }

  /**
   * Get import job by ID
   */
  async getImportById(importId: string): Promise<ResumeImport> {
    const importJob = await this.prisma.resumeImport.findUnique({
      where: { id: importId },
    });

    if (!importJob) {
      throw new NotFoundException('Import not found');
    }

    return importJob;
  }

  /**
   * Get import history for a user
   */
  async getImportHistory(userId: string): Promise<ResumeImport[]> {
    return this.prisma.resumeImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a pending import
   */
  async cancelImport(importId: string): Promise<void> {
    const importJob = await this.prisma.resumeImport.findUnique({
      where: { id: importId },
    });

    if (!importJob) {
      throw new NotFoundException('Import not found');
    }

    if (importJob.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed import');
    }

    await this.prisma.resumeImport.delete({
      where: { id: importId },
    });

    this.logger.log(`Import ${importId} cancelled`);
  }

  /**
   * Retry a failed import
   */
  async retryImport(importId: string): Promise<ImportResult> {
    const importJob = await this.prisma.resumeImport.findUnique({
      where: { id: importId },
    });

    if (!importJob) {
      throw new NotFoundException('Import not found');
    }

    if (importJob.status !== 'FAILED') {
      throw new BadRequestException('Can only retry failed imports');
    }

    // Reset status and process again
    await this.updateStatus(importId, 'PENDING');
    return this.processImport(importId);
  }

  /**
   * Update import status
   */
  private async updateStatus(
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
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Validate parsed resume data
   */
  private validateParsedData(data: ParsedResumeData): string[] {
    const errors: string[] = [];

    if (!data.personalInfo.name) {
      errors.push('Name is required');
    }

    return errors;
  }

  /**
   * Create resume from parsed data
   */
  private async createResumeFromParsed(
    userId: string,
    data: ParsedResumeData,
    importId: string,
  ): Promise<{ id: string }> {
    // Create the resume with basic info and link to import
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: `Imported Resume - ${data.personalInfo.name}`,
        summary: data.summary,
        import: {
          connect: { id: importId },
        },
      },
    });

    return resume;
  }
}
