import type { SectionDataV2 } from '@/bounded-contexts/dsl/domain/schemas/ast/generic-section-data.schema';

/**
 * Humanize a section key for display.
 * Removes version suffix and converts to title case.
 *
 * @example
 * humanizeKey('work_experience_v1') // 'Work Experience'
 * humanizeKey('summary_v1') // 'Summary'
 */
function humanizeKey(key: string): string {
  return key
    .replace(/_v\d+$/, '') // Remove _v1, _v2, etc
    .replace(/_/g, ' ') // Underscores to spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize each word
}

/**
 * Returns empty placeholder data for a section.
 * Uses translated title from sectionTypeTitles map if available.
 *
 * @param sectionId - The section ID from DSL (e.g., 'summary_v1')
 * @param sectionTypeTitles - Map of sectionTypeKey to translated title
 */
export function getPlaceholderData(
  sectionId: string,
  sectionTypeTitles?: Map<string, string>,
): SectionDataV2 {
  // Use translated title if available, otherwise humanize the key
  const translatedTitle = sectionTypeTitles?.get(sectionId);
  const title = translatedTitle ?? humanizeKey(sectionId);

  return {
    semanticKind: 'UNKNOWN',
    sectionTypeKey: sectionId,
    title,
    items: [],
  };
}
