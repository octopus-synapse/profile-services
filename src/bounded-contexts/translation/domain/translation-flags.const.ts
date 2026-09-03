/**
 * Kill-switch for the translation subsystem (ADR-003 §9).
 *
 * Registered in `platform/feature-flags/registry/groups/translation.flags.ts`
 * — boot validates that every key referenced in code exists there.
 */
export const TRANSLATION_FLAG_KEY = 'translation.enabled';
