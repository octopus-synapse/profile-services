import { LOCALES } from '@packages/i18n';
import type { Prisma, PrismaClient } from '@prisma/client';

export interface SectionGroupTranslation {
  title: string;
  description?: string;
}

export interface SectionGroupSeedData {
  key: string;
  iconType: 'lucide' | 'emoji';
  icon: string;
  order: number;
  // i18n: no fallback — every group must cover every LOCALE.
  translations: Record<string, SectionGroupTranslation>;
}

// Supersections: presentational groupings over section types. `profile` and the
// summary live on User columns (identity card), so no SectionType points at
// `profile` — the group exists so the frontend can label that card. Only
// `online_presence` currently owns a section type (links_v1).
export const sectionGroups: SectionGroupSeedData[] = [
  {
    key: 'profile',
    iconType: 'lucide',
    icon: 'user',
    order: 0,
    translations: {
      en: { title: 'Profile', description: 'Who you are' },
      'pt-BR': { title: 'Perfil', description: 'Quem você é' },
    },
  },
  {
    key: 'online_presence',
    iconType: 'lucide',
    icon: 'link',
    order: 1,
    translations: {
      en: { title: 'Online presence', description: 'Where to find you' },
      'pt-BR': { title: 'Presença online', description: 'Onde te encontrar' },
    },
  },
];

/** The set of valid group keys — used by seedSectionTypes to guard groupKey. */
export const SECTION_GROUP_KEYS: ReadonlySet<string> = new Set(sectionGroups.map((g) => g.key));

function assertGroupTranslations(group: SectionGroupSeedData): void {
  for (const locale of LOCALES) {
    const t = group.translations[locale];
    if (!t?.title?.trim()) {
      throw new Error(
        `[section-group] '${group.key}' missing/empty title for locale '${locale}'. ` +
          `Every group must be translated for all locales — no fallback.`,
      );
    }
  }
  for (const locale of Object.keys(group.translations)) {
    if (!(LOCALES as readonly string[]).includes(locale)) {
      throw new Error(`[section-group] '${group.key}' has rogue locale '${locale}'`);
    }
  }
}

export async function seedSectionGroups(prisma: PrismaClient) {
  console.log('🗂️  Seeding section groups...');

  for (const group of sectionGroups) {
    assertGroupTranslations(group);
    const { key, translations, ...rest } = group;
    await prisma.sectionGroup.upsert({
      where: { key },
      update: {
        ...rest,
        translations: translations as unknown as Prisma.InputJsonValue,
      },
      create: {
        key,
        ...rest,
        translations: translations as unknown as Prisma.InputJsonValue,
      },
    });
  }

  console.log(`✅ Seeded ${sectionGroups.length} section groups`);
}
