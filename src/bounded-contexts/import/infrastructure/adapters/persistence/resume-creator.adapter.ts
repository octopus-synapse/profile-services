/**
 * Prisma Resume Creator Adapter
 *
 * Infrastructure adapter implementing ResumeCreatorPort using Prisma.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumeCreatorPort } from '../../../domain/ports/resume-creator.port';
import type { ParsedResumeData } from '../../../domain/types/import.types';

@Injectable()
export class PrismaResumeCreatorAdapter implements ResumeCreatorPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: ParsedResumeData, importId: string): Promise<{ id: string }> {
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: `Imported Resume - ${data.personalInfo.name}`,
        summary: data.summary,
        import: { connect: { id: importId } },
      },
    });
    return { id: resume.id };
  }
}
