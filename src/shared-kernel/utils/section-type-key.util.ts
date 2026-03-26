const LEGACY_SECTION_TYPE_KEY_MAP = {
  skill_v1: 'skill_set_v1',
} as const;

export function normalizeSectionTypeKey(sectionTypeKey: string): string {
  return (
    LEGACY_SECTION_TYPE_KEY_MAP[sectionTypeKey as keyof typeof LEGACY_SECTION_TYPE_KEY_MAP] ??
    sectionTypeKey
  );
}
