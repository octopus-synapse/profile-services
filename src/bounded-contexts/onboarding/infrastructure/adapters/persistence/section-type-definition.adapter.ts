/**
 * Section Type Definition Adapter
 *
 * Prisma persistence logic for querying section type definitions.
 * Moved from application/services/section-type-definition.query.ts.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SectionTypeData } from '../../../domain/config/onboarding-steps.config';
import { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';

interface TranslationData {
  title?: string;
  description?: string;
  label?: string;
  noDataLabel?: string;
  placeholder?: string;
  addLabel?: string;
}

export class SectionTypeDefinitionAdapter extends SectionTypeDefinitionPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(locale = 'en'): Promise<SectionTypeData[]> {
    const types = await this.prisma.sectionType.findMany({
      where: { isActive: true },
      select: {
        key: true,
        title: true,
        description: true,
        definition: true,
        icon: true,
        iconType: true,
        translations: true,
      },
    });

    return types.map((type) => this.resolveTranslations(type, locale));
  }

  private resolveTranslations(
    type: {
      key: string;
      title: string;
      description: string | null;
      definition: unknown;
      icon: string;
      iconType: string | null;
      translations: unknown;
    },
    locale: string,
  ): SectionTypeData {
    const translations = type.translations as Record<string, TranslationData> | null;
    const localeData = translations?.[locale] ?? translations?.en ?? {};

    return {
      key: type.key,
      title: localeData.title ?? type.title,
      description: localeData.description ?? type.description ?? '',
      definition: type.definition,
      icon: type.icon ?? 'list',
      iconType: type.iconType ?? 'lucide',
      label: localeData.label ?? type.key,
      noDataLabel: localeData.noDataLabel ?? "I don't have items to add",
      placeholder: localeData.placeholder ?? 'Add items...',
      addLabel: localeData.addLabel ?? 'Add Item',
    };
  }
}
