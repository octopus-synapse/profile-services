import type { VariantOverrides } from './variant.types';

export interface GenericSectionItem {
  readonly id: string;
  readonly content: Record<string, unknown>;
  readonly isVisible: boolean;
  readonly order: number;
}

export interface GenericResumeSection {
  readonly id: string;
  readonly sectionTypeKey: string;
  readonly semanticKind: string;
  readonly title: string;
  readonly titleOverride?: string;
  readonly isVisible: boolean;
  readonly order: number;
  readonly items: GenericSectionItem[];
}

function deepCloneSections(sections: GenericResumeSection[]): GenericResumeSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      content: { ...item.content },
    })),
  }));
}

function applyTextOverrides(
  sections: GenericResumeSection[],
  textOverrides: Record<string, string>,
): void {
  // Index overrides by itemId for O(1) lookup per item
  const byItemId = new Map<string, [fieldKey: string, value: string][]>();

  for (const [key, value] of Object.entries(textOverrides)) {
    const colonIdx = key.indexOf(':');
    if (colonIdx === -1) continue;

    const itemId = key.slice(0, colonIdx);
    const fieldKey = key.slice(colonIdx + 1);

    let entries = byItemId.get(itemId);
    if (!entries) {
      entries = [];
      byItemId.set(itemId, entries);
    }
    entries.push([fieldKey, value]);
  }

  for (const section of sections) {
    for (const item of section.items) {
      const entries = byItemId.get(item.id);
      if (!entries) continue;

      for (const [fieldKey, value] of entries) {
        (item.content as Record<string, unknown>)[fieldKey] = value;
      }
    }
  }
}

function applyVisibilityOverrides(
  sections: GenericResumeSection[],
  visibilityOverrides: Record<string, boolean>,
): void {
  for (const section of sections) {
    if (section.id in visibilityOverrides) {
      (section as { isVisible: boolean }).isVisible = visibilityOverrides[section.id];
    }

    for (const item of section.items) {
      if (item.id in visibilityOverrides) {
        (item as { isVisible: boolean }).isVisible = visibilityOverrides[item.id];
      }
    }
  }
}

function applyOrderOverrides(
  sections: GenericResumeSection[],
  orderOverrides: Record<string, number>,
): void {
  if (Object.keys(orderOverrides).length === 0) return;

  // Separate sections with overrides from those without
  const withOverride: GenericResumeSection[] = [];
  const withoutOverride: GenericResumeSection[] = [];

  for (const section of sections) {
    if (section.id in orderOverrides) {
      (section as { order: number }).order = orderOverrides[section.id];
      withOverride.push(section);
    } else {
      withoutOverride.push(section);
    }
  }

  // Sort overridden sections by their new order
  withOverride.sort((a, b) => a.order - b.order);

  // Merge: place overridden sections at their target positions,
  // non-overridden sections fill remaining slots in original order
  const result: GenericResumeSection[] = new Array(sections.length);
  const _overrideByOrder = new Map(withOverride.map((s) => [s.order, s]));

  // Place overridden sections at their target indices (clamped to bounds)
  for (const section of withOverride) {
    const targetIdx = Math.min(section.order, sections.length - 1);
    result[targetIdx] = section;
  }

  // Fill remaining slots with non-overridden sections in original order
  let fillIdx = 0;
  for (const section of withoutOverride) {
    while (fillIdx < result.length && result[fillIdx] !== undefined) fillIdx++;
    if (fillIdx < result.length) result[fillIdx] = section;
    fillIdx++;
  }

  // Update the original array in-place
  for (let i = 0; i < sections.length; i++) {
    sections[i] = result[i];
    (sections[i] as { order: number }).order = i;
  }
}

export function applyVariantOverlay(
  baseSections: GenericResumeSection[],
  overrides: VariantOverrides,
): GenericResumeSection[] {
  const sections = deepCloneSections(baseSections);

  applyTextOverrides(sections, overrides.textOverrides);
  applyVisibilityOverrides(sections, overrides.visibilityOverrides);
  applyOrderOverrides(sections, overrides.orderOverrides);

  return sections;
}
