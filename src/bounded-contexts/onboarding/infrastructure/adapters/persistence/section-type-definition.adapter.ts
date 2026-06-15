/**
 * Section Type Definition Adapter
 *
 * Prisma persistence logic for querying section type definitions.
 * Moved from application/services/section-type-definition.query.ts.
 *
 * i18n is mandatory — no fallback. Section labels and field labels are
 * resolved through the shared locale resolvers, which THROW when a
 * translation is missing for the requested locale (drift between the catalog
 * and the seed dictionaries is a BUG, not a silently-English label). The
 * parity specs in test/static-analysis/i18n are the first line of defence.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { TranslationsJson } from '@/shared-kernel/utils/locale-resolver.types';
import {
  parseLocale,
  resolveDefinitionFieldsForLocale,
  resolveTranslation,
} from '@/shared-kernel/utils/locale-resolver.util';
import type { SectionTypeData } from '../../../domain/config/onboarding-steps.config';
import { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';

export class SectionTypeDefinitionAdapter extends SectionTypeDefinitionPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listAll(locale = 'en'): Promise<SectionTypeData[]> {
    const types = await this.prisma.sectionType.findMany({
      // Onboarding only ever surfaces the system catalog. Filtering on
      // `isSystem` keeps non-system rows out — notably leaked Dredd fixtures
      // (e.g. `fixture-slug`, isSystem:false) that carry no translations and
      // would otherwise make `resolveTranslation` throw, 500-ing onboarding
      // for every user (parity with the onboarding-config / generic-sections
      // adapters, which already exclude them).
      where: { isActive: true, isSystem: true },
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
    const loc = parseLocale(locale);
    // Throws if this section type has no translation for the locale.
    const t = resolveTranslation(type.translations as TranslationsJson | null, loc, type.key);

    return {
      key: type.key,
      title: t.title,
      description: t.description,
      // Throws if any visible field lacks a translation for the locale.
      definition: resolveDefinitionFieldsForLocale(type.definition, loc),
      icon: type.icon ?? 'list',
      iconType: type.iconType ?? 'lucide',
      label: t.label,
      noDataLabel: t.noDataLabel,
      placeholder: t.placeholder,
      addLabel: t.addLabel,
    };
  }
}
