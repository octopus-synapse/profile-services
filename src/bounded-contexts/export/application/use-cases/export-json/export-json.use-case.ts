/**
 * Export JSON Use Case
 *
 * Exports resume data in JSON Resume or Profile format.
 * Definition-driven - sections exported generically.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  ResumeDataRepositoryPort,
  ResumeForJsonExport,
} from '../../../domain/ports/resume-data.repository.port';

// ============================================================================
// DTOs & Types
// ============================================================================

export interface ExportJsonDto {
  resumeId: string;
  format?: 'jsonresume' | 'profile';
  language?: 'en' | 'pt';
}

interface JsonResumeBasics {
  name: string;
  label: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: {
    city?: string;
    countryCode?: string;
  };
}

interface JsonResumeSection {
  semanticKind: string;
  items: Record<string, unknown>[];
}

interface JsonResume {
  $schema: string;
  basics: JsonResumeBasics;
  sections: JsonResumeSection[];
}

interface ProfileFormat {
  format: 'profile';
  version: string;
  resume: Record<string, unknown>;
}

// ============================================================================
// Use Case
// ============================================================================

export class ExportJsonUseCase {
  constructor(private readonly resumeDataRepository: ResumeDataRepositoryPort) {}

  async execute(dto: ExportJsonDto): Promise<JsonResume | ProfileFormat> {
    const resume = await this.resumeDataRepository.findForJsonExport(dto.resumeId);

    if (!resume) {
      throw new EntityNotFoundException('Resume', dto.resumeId);
    }

    if (dto.format === 'profile') {
      return this.toProfileFormat(resume);
    }

    return this.toJsonResume(resume);
  }

  async executeAsBuffer(dto: ExportJsonDto): Promise<Buffer> {
    const json = await this.execute(dto);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  private toJsonResume(resume: ResumeForJsonExport): JsonResume {
    return {
      $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      basics: {
        name: resume.user.name ?? 'Unknown',
        label: resume.jobTitle ?? resume.title ?? 'Professional',
        email: resume.user.email ?? undefined,
        phone: resume.user.phone ?? undefined,
        summary: resume.summary ?? undefined,
      },
      sections: resume.sections.map((section) => ({
        semanticKind: section.semanticKind,
        items: section.items.map((item) => item.content),
      })),
    };
  }

  private toProfileFormat(resume: ResumeForJsonExport): ProfileFormat {
    return {
      format: 'profile',
      version: '1.0',
      resume: {
        id: resume.id,
        title: resume.title,
        slug: resume.slug,
        user: {
          name: resume.user.name,
          email: resume.user.email,
        },
        sections: resume.sections.map((section) => ({
          semanticKind: section.semanticKind,
          items: section.items.map((item) => item.content),
        })),
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    };
  }
}
