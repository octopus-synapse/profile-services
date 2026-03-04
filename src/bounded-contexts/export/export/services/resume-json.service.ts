import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

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

export interface JsonExportOptions {
  format?: 'jsonresume' | 'profile';
  language?: 'en' | 'pt';
}

/**
 * Generic section structure for JSON export.
 */
interface GenericSection {
  semanticKind: string;
  items: Array<{ content: Record<string, unknown> }>;
}

type ResumeWithRelations = {
  id: string;
  title: string | null;
  slug: string | null;
  summary: string | null;
  jobTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  sections: GenericSection[];
};

/**
 * ResumeJsonService - Definition-driven JSON export.
 *
 * Exports resume data in JSON Resume or Profile format.
 * No type-specific logic - sections exported generically.
 */
@Injectable()
export class ResumeJsonService {
  constructor(private readonly prisma: PrismaService) {}

  async exportAsJson(
    resumeId: string,
    options: JsonExportOptions = {},
  ): Promise<JsonResume | ProfileFormat> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: true,
        resumeSections: {
          include: {
            sectionType: {
              select: {
                semanticKind: true,
              },
            },
            items: {
              orderBy: { order: 'asc' },
              select: {
                content: true,
              },
            },
          },
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    const normalizedResume = this.normalizeResume(resume);

    if (options.format === 'profile') {
      return this.toProfileFormat(normalizedResume);
    }

    return this.toJsonResume(normalizedResume);
  }

  async exportAsBuffer(resumeId: string, options: JsonExportOptions = {}): Promise<Buffer> {
    const json = await this.exportAsJson(resumeId, options);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  private toJsonResume(resume: ResumeWithRelations): JsonResume {
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

  private toProfileFormat(resume: ResumeWithRelations): ProfileFormat {
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

  /**
   * Normalize resume data - inline generic mapping, no adapter needed.
   */
  private normalizeResume(resume: {
    id: string;
    title: string | null;
    slug: string | null;
    summary: string | null;
    jobTitle: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      name: string | null;
      email: string | null;
      phone: string | null;
    };
    resumeSections: Array<{
      sectionType: { semanticKind: string };
      items: Array<{ content: unknown }>;
    }>;
  }): ResumeWithRelations {
    // Direct mapping - no adapter dependency
    const sections: GenericSection[] = resume.resumeSections.map((rs) => ({
      semanticKind: rs.sectionType.semanticKind,
      items: rs.items.map((item) => ({
        content: item.content as Record<string, unknown>,
      })),
    }));

    return {
      id: resume.id,
      title: resume.title,
      slug: resume.slug,
      summary: resume.summary,
      jobTitle: resume.jobTitle,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      user: resume.user,
      sections,
    };
  }
}
