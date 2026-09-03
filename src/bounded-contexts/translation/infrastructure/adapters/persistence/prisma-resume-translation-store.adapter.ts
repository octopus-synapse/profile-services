import type { Locale } from '@packages/i18n';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { TranslationEnvelope } from '@/shared-kernel/i18n/translation-envelope';
import { parseLocale } from '@/shared-kernel/utils/locale-resolver.util';
import type { PolicyFieldDefinition } from '../../../domain/policies/field-translation.policy';
import {
  ResumeTranslationStorePort,
  type TranslatableResume,
} from '../../../domain/ports/resume-translation-store.port';

/** Fields as the seed stores them: possibly nested groups, only leaves with a `key` matter. */
function flattenFields(fields: unknown): PolicyFieldDefinition[] {
  if (!Array.isArray(fields)) return [];
  const out: PolicyFieldDefinition[] = [];
  for (const f of fields as Array<Record<string, unknown>>) {
    if (typeof f.key === 'string' && typeof f.semanticRole === 'string') {
      out.push({ key: f.key, semanticRole: f.semanticRole });
    }
    if (Array.isArray(f.fields)) out.push(...flattenFields(f.fields));
  }
  return out;
}

export class PrismaResumeTranslationStoreAdapter extends ResumeTranslationStorePort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async load(resumeId: string): Promise<TranslatableResume | null> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        id: true,
        userId: true,
        language: true,
        summary: true,
        headline: true,
        jobTitle: true,
        translations: true,
        resumeSections: {
          orderBy: { order: 'asc' },
          select: {
            sectionType: { select: { key: true, definition: true } },
            items: {
              orderBy: { order: 'asc' },
              select: { id: true, content: true, translations: true },
            },
          },
        },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      language: parseLocale(row.language),
      prose: { summary: row.summary, headline: row.headline, jobTitle: row.jobTitle },
      translations: row.translations,
      sections: row.resumeSections
        .filter((s) => s.sectionType !== null)
        .map((s) => ({
          sectionTypeKey: s.sectionType!.key,
          fields: flattenFields((s.sectionType!.definition as { fields?: unknown } | null)?.fields),
          items: s.items.map((i) => ({
            id: i.id,
            content: (i.content ?? {}) as Record<string, unknown>,
            translations: i.translations,
          })),
        })),
    };
  }

  async saveItemTranslation(
    itemId: string,
    locale: Locale,
    envelope: TranslationEnvelope,
  ): Promise<void> {
    const current = await this.prisma.sectionItem.findUnique({
      where: { id: itemId },
      select: { translations: true },
    });
    const merged = { ...asRecord(current?.translations), [locale]: envelope };
    await this.prisma.sectionItem.update({
      where: { id: itemId },
      data: { translations: merged as Prisma.InputJsonValue },
    });
    this.logger.debug(
      `Stored ${locale} translation for item ${itemId}`,
      'PrismaResumeTranslationStoreAdapter',
    );
  }

  async saveResumeTranslation(
    resumeId: string,
    locale: Locale,
    envelope: TranslationEnvelope,
  ): Promise<void> {
    const current = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { translations: true },
    });
    const merged = { ...asRecord(current?.translations), [locale]: envelope };
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: { translations: merged as Prisma.InputJsonValue },
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
