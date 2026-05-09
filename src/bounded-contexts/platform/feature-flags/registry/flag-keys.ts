/**
 * P2-108 — typed const map of flag keys referenced in code outside the
 * registry (route guards, service doc-comments). The registry remains
 * the source of truth for flag *definitions*; this file just stops
 * callers from typing the dotted-key string by hand and drifting from
 * what the registry declares.
 *
 * Keep this file minimal — only add a constant when a non-registry
 * file needs to reference the flag. The registry validates on boot
 * that every key listed here exists in `FEATURE_FLAGS_REGISTRY`.
 */
export const FLAG_KEYS = {
  RESUMES_EXPORT_PDF: 'resumes.export.pdf',
  RESUMES_EXPORT_DOCX: 'resumes.export.docx',
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];
