import type { PrismaClient } from '@prisma/client';

interface SpokenLanguageData {
  code: string;
  nameEn: string;
  namePtBr: string;
  nameEs: string;
  nativeName?: string;
  order: number;
}

// ~30 most common languages for resumes + "Other" option
const spokenLanguages: SpokenLanguageData[] = [
  // Top global languages
  { code: 'en', nameEn: 'English', namePtBr: 'Inglês', nameEs: 'Inglés', nativeName: 'English', order: 1 },
  { code: 'es', nameEn: 'Spanish', namePtBr: 'Espanhol', nameEs: 'Español', nativeName: 'Español', order: 2 },
  { code: 'zh', nameEn: 'Chinese (Mandarin)', namePtBr: 'Chinês (Mandarim)', nameEs: 'Chino (Mandarín)', nativeName: '中文', order: 3 },
  { code: 'hi', nameEn: 'Hindi', namePtBr: 'Hindi', nameEs: 'Hindi', nativeName: 'हिन्दी', order: 4 },
  { code: 'ar', nameEn: 'Arabic', namePtBr: 'Árabe', nameEs: 'Árabe', nativeName: 'العربية', order: 5 },
  { code: 'pt', nameEn: 'Portuguese', namePtBr: 'Português', nameEs: 'Portugués', nativeName: 'Português', order: 6 },
  { code: 'bn', nameEn: 'Bengali', namePtBr: 'Bengali', nameEs: 'Bengalí', nativeName: 'বাংলা', order: 7 },
  { code: 'ru', nameEn: 'Russian', namePtBr: 'Russo', nameEs: 'Ruso', nativeName: 'Русский', order: 8 },
  { code: 'ja', nameEn: 'Japanese', namePtBr: 'Japonês', nameEs: 'Japonés', nativeName: '日本語', order: 9 },
  { code: 'de', nameEn: 'German', namePtBr: 'Alemão', nameEs: 'Alemán', nativeName: 'Deutsch', order: 10 },

  // European languages
  { code: 'fr', nameEn: 'French', namePtBr: 'Francês', nameEs: 'Francés', nativeName: 'Français', order: 11 },
  { code: 'it', nameEn: 'Italian', namePtBr: 'Italiano', nameEs: 'Italiano', nativeName: 'Italiano', order: 12 },
  { code: 'nl', nameEn: 'Dutch', namePtBr: 'Holandês', nameEs: 'Holandés', nativeName: 'Nederlands', order: 13 },
  { code: 'pl', nameEn: 'Polish', namePtBr: 'Polonês', nameEs: 'Polaco', nativeName: 'Polski', order: 14 },
  { code: 'uk', nameEn: 'Ukrainian', namePtBr: 'Ucraniano', nameEs: 'Ucraniano', nativeName: 'Українська', order: 15 },
  { code: 'ro', nameEn: 'Romanian', namePtBr: 'Romeno', nameEs: 'Rumano', nativeName: 'Română', order: 16 },
  { code: 'el', nameEn: 'Greek', namePtBr: 'Grego', nameEs: 'Griego', nativeName: 'Ελληνικά', order: 17 },
  { code: 'cs', nameEn: 'Czech', namePtBr: 'Tcheco', nameEs: 'Checo', nativeName: 'Čeština', order: 18 },
  { code: 'sv', nameEn: 'Swedish', namePtBr: 'Sueco', nameEs: 'Sueco', nativeName: 'Svenska', order: 19 },
  { code: 'hu', nameEn: 'Hungarian', namePtBr: 'Húngaro', nameEs: 'Húngaro', nativeName: 'Magyar', order: 20 },

  // Asian languages
  { code: 'ko', nameEn: 'Korean', namePtBr: 'Coreano', nameEs: 'Coreano', nativeName: '한국어', order: 21 },
  { code: 'vi', nameEn: 'Vietnamese', namePtBr: 'Vietnamita', nameEs: 'Vietnamita', nativeName: 'Tiếng Việt', order: 22 },
  { code: 'th', nameEn: 'Thai', namePtBr: 'Tailandês', nameEs: 'Tailandés', nativeName: 'ไทย', order: 23 },
  { code: 'id', nameEn: 'Indonesian', namePtBr: 'Indonésio', nameEs: 'Indonesio', nativeName: 'Bahasa Indonesia', order: 24 },
  { code: 'ms', nameEn: 'Malay', namePtBr: 'Malaio', nameEs: 'Malayo', nativeName: 'Bahasa Melayu', order: 25 },
  { code: 'tl', nameEn: 'Filipino (Tagalog)', namePtBr: 'Filipino (Tagalo)', nameEs: 'Filipino (Tagalo)', nativeName: 'Tagalog', order: 26 },

  // Middle Eastern and African
  { code: 'tr', nameEn: 'Turkish', namePtBr: 'Turco', nameEs: 'Turco', nativeName: 'Türkçe', order: 27 },
  { code: 'he', nameEn: 'Hebrew', namePtBr: 'Hebraico', nameEs: 'Hebreo', nativeName: 'עברית', order: 28 },
  { code: 'fa', nameEn: 'Persian (Farsi)', namePtBr: 'Persa (Farsi)', nameEs: 'Persa (Farsi)', nativeName: 'فارسی', order: 29 },
  { code: 'sw', nameEn: 'Swahili', namePtBr: 'Suaíli', nameEs: 'Suajili', nativeName: 'Kiswahili', order: 30 },

  // Other option (always last)
  { code: 'other', nameEn: 'Other', namePtBr: 'Outro', nameEs: 'Otro', order: 999 },
];

export async function seedSpokenLanguages(prisma: PrismaClient): Promise<void> {
  console.log('🌍 Seeding spoken languages...');

  let created = 0;
  let updated = 0;

  for (const lang of spokenLanguages) {
    const existing = await prisma.spokenLanguage.findUnique({
      where: { code: lang.code },
    });

    if (existing) {
      await prisma.spokenLanguage.update({
        where: { code: lang.code },
        data: {
          nameEn: lang.nameEn,
          namePtBr: lang.namePtBr,
          nameEs: lang.nameEs,
          nativeName: lang.nativeName,
          order: lang.order,
          isActive: true,
        },
      });
      updated++;
    } else {
      await prisma.spokenLanguage.create({
        data: {
          code: lang.code,
          nameEn: lang.nameEn,
          namePtBr: lang.namePtBr,
          nameEs: lang.nameEs,
          nativeName: lang.nativeName,
          order: lang.order,
          isActive: true,
        },
      });
      created++;
    }
  }

  console.log(`✅ Spoken languages seeded: ${created} created, ${updated} updated`);
  console.log(`   Total: ${spokenLanguages.length} languages (including "Other")`);
}
