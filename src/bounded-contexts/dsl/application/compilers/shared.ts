import type {
  ExperienceItem,
  EducationItem,
  SkillItem,
  LanguageItem,
  ProjectItem,
  CertificationItem,
  AwardItem,
  ReferenceItem,
  InterestItem,
  SectionData,
} from '@/shared-kernel';

type ItemOverride = { itemId: string; visible?: boolean; order?: number };

export function applyOverrides<T extends { id: string; order: number }>(
  items: T[],
  overrides: ItemOverride[],
): T[] {
  return items
    .filter((item) => {
      const override = overrides.find((o) => o.itemId === item.id);
      return override?.visible !== false;
    })
    .map((item) => {
      const override = overrides.find((o) => o.itemId === item.id);
      if (override?.order !== undefined) {
        return { ...item, order: override.order };
      }
      return item;
    })
    .sort((a, b) => a.order - b.order);
}

export function mapSkillLevel(level: number | null): string | undefined {
  if (level === null) return undefined;
  if (level >= 5) return 'Expert';
  if (level >= 4) return 'Advanced';
  if (level >= 3) return 'Intermediate';
  if (level >= 2) return 'Elementary';
  return 'Beginner';
}

export { ExperienceItem, EducationItem, SkillItem, LanguageItem };
export {
  ProjectItem,
  CertificationItem,
  AwardItem,
  ReferenceItem,
  InterestItem,
};
export type { SectionData, ItemOverride };
