/**
 * Section Projection Utilities
 *
 * Generic field extraction utilities for working with section content.
 * NO type-specific knowledge - all functions work with generic JSON content.
 *
 * Architecture:
 *   - All functions are GENERIC (getString, getDate, etc.)
 *   - NO projectExperience, projectEducation, etc.
 *   - Field names come from SectionType.definition, not code
 *   - Adding a new section type requires ZERO code changes here
 */

import type { GenericSectionItem } from './generic-section.types';

/**
 * Minimal section item interface for projection operations.
 */
export interface SectionItemInput {
  id: string;
  order: number;
  isVisible: boolean;
  content: Record<string, unknown>;
}

/**
 * Minimal section interface for projection operations.
 */
export interface SectionInput {
  id: string;
  semanticKind: string;
  order: number;
  isVisible: boolean;
  items: SectionItemInput[];
}

/**
 * Generic projection section for transforms.
 */
export interface ProjectionSection {
  semanticKind: string;
  items: Array<{
    content: Record<string, unknown>;
  }>;
}

// ============================================================================
// Field Extraction Utilities (GENERIC)
// ============================================================================

/**
 * Safely extract a string field from content.
 */
export function getString(content: Record<string, unknown>, key: string): string | null {
  const value = content[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Safely extract a required string field with fallback.
 */
export function getStringRequired(
  content: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  return getString(content, key) ?? fallback;
}

/**
 * Safely extract a number field from content.
 */
export function getNumber(content: Record<string, unknown>, key: string): number | null {
  const value = content[key];
  return typeof value === 'number' ? value : null;
}

/**
 * Safely extract a boolean field from content.
 */
export function getBoolean(content: Record<string, unknown>, key: string): boolean | null {
  const value = content[key];
  return typeof value === 'boolean' ? value : null;
}

/**
 * Safely extract a date field from content.
 */
export function getDate(content: Record<string, unknown>, key: string): Date | null {
  const value = content[key];

  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Safely extract a string array from content.
 */
export function getStringArray(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Map a numeric skill level (0-5) to a string label.
 */
export function mapSkillLevelToString(level: number): string {
  const levels = ['Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert', 'Master'];
  return levels[Math.min(Math.max(level, 0), levels.length - 1)];
}

// ============================================================================
// Section Query Utilities (GENERIC)
// ============================================================================

/**
 * Get visible items from a section.
 */
export function getVisibleItems(section: SectionInput): SectionItemInput[] {
  return section.items.filter((item) => item.isVisible);
}

/**
 * Find a section by semantic kind.
 */
export function findSectionByKind(sections: SectionInput[], kind: string): SectionInput | null {
  return sections.find((s) => s.semanticKind === kind) ?? null;
}

/**
 * Find all sections with a given semantic kind.
 */
export function findAllSectionsByKind(sections: SectionInput[], kind: string): SectionInput[] {
  return sections.filter((s) => s.semanticKind === kind);
}

/**
 * Get visible items from all sections with a given semantic kind.
 */
export function getVisibleItemsByKind(
  sections: Array<{
    semanticKind: string;
    items: GenericSectionItem[];
  }>,
  kind: string,
): GenericSectionItem[] {
  const section = sections.find((s) => s.semanticKind === kind);
  if (!section) return [];
  return section.items.filter((item) => item.isVisible !== false);
}

/**
 * Count items in each section by semantic kind.
 */
export function countItemsByKind(sections: SectionInput[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const section of sections) {
    const visible = getVisibleItems(section);
    counts[section.semanticKind] = (counts[section.semanticKind] ?? 0) + visible.length;
  }
  return counts;
}

/**
 * Calculate total experience years from date fields.
 * Works with any section that has startDate/endDate fields.
 */
export function calculateTotalYearsFromDates(
  items: Array<{ content: Record<string, unknown> }>,
): number {
  let totalMonths = 0;
  const now = new Date();

  for (const item of items) {
    const startDate = getDate(item.content, 'startDate');
    const endDate = getDate(item.content, 'endDate') ?? now;
    const isCurrent = getBoolean(item.content, 'isCurrent');

    if (!startDate) continue;

    const end = isCurrent ? now : endDate;
    const months =
      (end.getFullYear() - startDate.getFullYear()) * 12 + (end.getMonth() - startDate.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round((totalMonths / 12) * 10) / 10;
}

// ============================================================================
// Generic Section Transformation
// ============================================================================

/**
 * Raw section from Prisma query.
 */
interface RawSection {
  sectionType: { semanticKind: string };
  items: Array<{ content: unknown }>;
}

/**
 * Transform raw Prisma sections to generic projection format.
 */
export function toGenericSections(rawSections: RawSection[]): ProjectionSection[] {
  return rawSections.map((rs) => ({
    semanticKind: rs.sectionType.semanticKind,
    items: rs.items.map((item) => ({
      content: item.content as Record<string, unknown>,
    })),
  }));
}

/**
 * Generic item extractor - works for ANY section type.
 * Extracts fields by name without knowing section type.
 */
export function extractFields(
  content: Record<string, unknown>,
  fieldNames: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fieldNames) {
    if (content[field] !== undefined) {
      result[field] = content[field];
    }
  }
  return result;
}

/**
 * Generic item projection - returns all content fields.
 */
export function projectGenericItem(item: GenericSectionItem): Record<string, unknown> {
  return {
    id: item.id,
    ...item.content,
  };
}
