/**
 * Prisma adapter for the resume-DSL persistence port.
 *
 * Responsibility is strict: load resume rows + section type titles from
 * the database, normalize them into the canonical `GenericResume` shape,
 * and enforce the share-link gates (active flag + expiration). The
 * compiler / validator / merge logic does NOT live here — that's the
 * use case's job.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { resolveResumeProse, resolveStoredItem } from '@/shared-kernel/i18n/translation-envelope';
import type {
  GenericResume,
  GenericResumeSection,
  SemanticKind,
} from '@/shared-kernel/schemas/sections';
import {
  type Locale,
  parseLocale,
  type TranslationsJson,
  tryResolveTranslation,
} from '@/shared-kernel/utils/locale-resolver.util';
import { ResumeDslRepositoryPort } from '../../../domain/ports/resume-dsl.repository.port';
import { RESUME_RELATIONS_INCLUDE } from '../../queries/resume-query';

type PrismaResumeData = {
  id: string;
  userId: string;
  title?: string | null;
  language?: string | null;
  translations?: unknown;
  summary?: string | null;
  headline?: string | null;
  fullName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
  style?: { id: string; name: string; styleConfig: unknown } | null;
  customTheme?: unknown;
  createdAt: Date;
  updatedAt: Date;
  resumeSections?: Array<{
    id: string;
    sectionTypeId: string;
    titleOverride: string | null;
    isVisible: boolean;
    order: number;
    sectionType: { key: string; title: string; semanticKind: string; translations: unknown };
    items: Array<{
      id: string;
      order: number;
      isVisible: boolean;
      content: unknown;
      translations?: unknown;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
};

export class PrismaResumeDslRepository extends ResumeDslRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOwnedResume(
    resumeId: string,
    userId: string,
    locale: Locale,
  ): Promise<GenericResume | null> {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: RESUME_RELATIONS_INCLUDE,
    });
    if (!resume) return null;
    return this.normalizeToGenericResume(resume as PrismaResumeData, locale);
  }

  async findPublicResumeBySlug(slug: string, locale: Locale): Promise<GenericResume | null> {
    const share = await this.prisma.resumeShare.findUnique({
      where: { slug },
      include: { resume: { include: RESUME_RELATIONS_INCLUDE } },
    });
    if (!share?.isActive) return null;
    if (share.expiresAt && new Date() > share.expiresAt) return null;
    return this.normalizeToGenericResume(share.resume as PrismaResumeData, locale);
  }

  async getSectionTypeTitles(locale: Locale): Promise<Map<string, string>> {
    const sectionTypes = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      select: { key: true, title: true, translations: true },
    });
    const map = new Map<string, string>();
    for (const st of sectionTypes) {
      const translations = st.translations as TranslationsJson | null;
      // Render path degrades gracefully: a drifted/custom section type with no
      // translation for `locale` falls back to its base `title` column (NOT
      // NULL) instead of throwing and 500-ing every resume's preview.
      const resolved = tryResolveTranslation(translations, locale);
      map.set(st.key, resolved?.title || st.title);
    }
    return map;
  }

  /** The single canonical Prisma → GenericResume transformation. */
  private normalizeToGenericResume(resume: PrismaResumeData, locale: Locale): GenericResume {
    // ADR-003 §12: the document renders in ONE language. Section titles come
    // from the type's translations; the person's own text comes from the
    // item/résumé envelopes, falling back to the canonical text per field.
    const canonical = parseLocale(resume.language ?? undefined);
    const prose = resolveResumeProse(
      {
        summary: resume.summary ?? null,
        headline: resume.headline ?? null,
        jobTitle: resume.jobTitle ?? null,
      },
      resume.translations,
      canonical,
      locale,
    );
    const sections: GenericResumeSection[] = (resume.resumeSections ?? [])
      .filter((section) => section.isVisible)
      .sort((a, b) => a.order - b.order)
      .map((section) => {
        const translations = section.sectionType.translations as TranslationsJson | null;
        // Same render-path resilience as getSectionTypeTitles: a section whose
        // type lacks a translation for `locale` falls back to the base title
        // rather than crashing the render of an otherwise-valid resume.
        const resolved = tryResolveTranslation(translations, locale);
        const resolvedTitle = resolved?.title || section.sectionType.title;

        return {
          id: section.id,
          resumeId: resume.id,
          sectionTypeId: section.sectionTypeId,
          sectionTypeKey: section.sectionType.key,
          semanticKind: section.sectionType.semanticKind as SemanticKind,
          title: resolvedTitle,
          titleOverride: section.titleOverride,
          isVisible: section.isVisible,
          order: section.order,
          items: section.items
            .filter((item) => item.isVisible)
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              id: item.id,
              order: item.order,
              isVisible: item.isVisible,
              content: resolveStoredItem(
                this.asRecord(item.content),
                item.translations,
                canonical,
                locale,
              ).content,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            })),
        };
      });

    return {
      id: resume.id,
      userId: resume.userId,
      title: resume.title ?? null,
      summary: prose.summary,
      fullName: resume.fullName ?? null,
      jobTitle: prose.jobTitle,
      phone: resume.phone ?? null,
      location: resume.location ?? null,
      linkedin: resume.linkedin ?? null,
      github: resume.github ?? null,
      website: resume.website ?? null,
      sections,
      style: resume.style ?? null,
      customTheme: resume.customTheme,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }
}
