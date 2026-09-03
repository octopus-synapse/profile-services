/**
 * Prisma Resume Creator Adapter
 *
 * Infrastructure adapter implementing ResumeCreatorPort using Prisma.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { detectLocale } from '@/shared-kernel/i18n/detect-locale';
import type { ResumeCreatorPort } from '../../../domain/ports/resume-creator.port';
import type { ParsedResumeData } from '../../../domain/types/import.types';

export class PrismaResumeCreatorAdapter implements ResumeCreatorPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: ParsedResumeData, importId: string): Promise<{ id: string }> {
    // ADR-003 §10 / decision 18: the résumé's language is read off its own
    // prose. Undetectable (a bare stack list) leaves the column default.
    const language = detectLocale(proseOf(data));
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: `Imported Resume - ${data.personalInfo.name}`,
        summary: data.summary,
        ...(language ? { language } : {}),
        import: { connect: { id: importId } },
      },
    });
    return { id: resume.id };
  }
}

/** Every string the parsed résumé carries, joined — what the detector reads. */
function proseOf(data: ParsedResumeData): string {
  const out: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) for (const v of value) walk(v);
    else if (value && typeof value === 'object') for (const v of Object.values(value)) walk(v);
  };
  walk(data);
  return out.join(' ');
}
