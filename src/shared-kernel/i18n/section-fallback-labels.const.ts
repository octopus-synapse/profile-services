/**
 * P2-111 — last-resort fallback strings for section-type labels when
 * the translated record is missing entirely. These should never reach
 * a normal end user (the section-type seeder writes en + pt-BR rows
 * for every system section type) — they exist so a malformed DB row
 * doesn't crash the picker UI.
 *
 * Kept English-only intentionally: a fallback here means "the data
 * is broken"; routing it through the i18n catalog would mask that.
 * Three call-sites used to embed these literals; now they all import
 * from this single source.
 */
export const SECTION_FALLBACK_LABELS = {
  noDataLabel: "I don't have items to add",
  placeholder: 'Add items...',
  addLabel: 'Add Item',
} as const;
