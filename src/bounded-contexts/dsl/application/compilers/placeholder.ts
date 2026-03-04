import type { SectionDataV2 } from '@/shared-kernel/ast/generic-section-data.schema';

/**
 * Returns empty placeholder data for a section.
 * No type-specific knowledge - always returns generic structure.
 */
export function getPlaceholderData(sectionId: string): SectionDataV2 {
  // Generic empty section - no hardcoded types
  return {
    semanticKind: 'UNKNOWN',
    sectionTypeKey: sectionId,
    title: sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
    items: [],
  };
}
