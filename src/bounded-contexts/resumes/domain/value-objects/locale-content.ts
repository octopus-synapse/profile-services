import { z } from 'zod';

export const SupportedLocaleSchema = z.enum([
  'pt-BR',
  'en',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh',
]);

export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;

export const LocalizedSectionSchema = z.object({
  title: z.string(),
  items: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type LocalizedSection = z.infer<typeof LocalizedSectionSchema>;

export const LocaleContentSchema = z.object({
  defaultLocale: SupportedLocaleSchema,
  locales: z.array(SupportedLocaleSchema).min(1),
  sections: z.record(
    z.string(),
    z.record(SupportedLocaleSchema, LocalizedSectionSchema),
  ),
});

export type LocaleContent = z.infer<typeof LocaleContentSchema>;

export type ResolvedLocaleContent = {
  locale: string;
  sections: Record<string, LocalizedSection>;
};

export function resolveForLocale(
  content: LocaleContent,
  locale: SupportedLocale,
): ResolvedLocaleContent {
  const resolved: Record<string, LocalizedSection> = {};

  for (const [sectionKey, localeMap] of Object.entries(content.sections)) {
    const section =
      localeMap[locale] ??
      localeMap[content.defaultLocale] ??
      Object.values(localeMap)[0];

    if (section) {
      resolved[sectionKey] = section;
    }
  }

  const actualLocale =
    content.locales.includes(locale) ? locale : content.defaultLocale;

  return { locale: actualLocale, sections: resolved };
}

export function migrateFromLegacy(
  contentPtBr: unknown,
  contentEn: unknown,
): LocaleContent {
  const hasPtBr = contentPtBr != null && typeof contentPtBr === 'object';
  const hasEn = contentEn != null && typeof contentEn === 'object';

  const locales: SupportedLocale[] = [];
  if (hasPtBr) locales.push('pt-BR');
  if (hasEn) locales.push('en');

  const defaultLocale: SupportedLocale =
    hasPtBr ? 'pt-BR' : hasEn ? 'en' : 'pt-BR';

  if (locales.length === 0) {
    return { defaultLocale: 'pt-BR', locales: ['pt-BR'], sections: {} };
  }

  const legacySectionKey = 'legacy_content_v1';
  const localeMap: Record<string, LocalizedSection> = {};

  if (hasPtBr) {
    localeMap['pt-BR'] = {
      title: 'Content',
      items: [contentPtBr as Record<string, unknown>],
    };
  }

  if (hasEn) {
    localeMap.en = {
      title: 'Content',
      items: [contentEn as Record<string, unknown>],
    };
  }

  const sections: LocaleContent['sections'] = { [legacySectionKey]: localeMap };

  return { defaultLocale, locales, sections };
}

export function addLocale(
  content: LocaleContent,
  locale: SupportedLocale,
  sectionData: Record<string, LocalizedSection>,
): LocaleContent {
  const updatedLocales = content.locales.includes(locale)
    ? [...content.locales]
    : [...content.locales, locale];

  const updatedSections: LocaleContent['sections'] = {};

  for (const [sectionKey, localeMap] of Object.entries(content.sections)) {
    updatedSections[sectionKey] = { ...localeMap };
  }

  for (const [sectionKey, section] of Object.entries(sectionData)) {
    updatedSections[sectionKey] = {
      ...updatedSections[sectionKey],
      [locale]: section,
    };
  }

  return {
    defaultLocale: content.defaultLocale,
    locales: updatedLocales,
    sections: updatedSections,
  };
}
