import type { Language } from '@prisma/client';
import {
  applyOverrides,
  type LanguageItem,
  type ItemOverride,
  type SectionData,
} from './shared';

export function compileLanguages(
  languages: Language[],
  overrides: ItemOverride[],
): SectionData {
  const items = applyOverrides(languages, overrides).map(
    (lang): LanguageItem => ({
      id: lang.id,
      name: lang.name,
      proficiency: lang.level,
    }),
  );
  return { type: 'languages', items };
}
