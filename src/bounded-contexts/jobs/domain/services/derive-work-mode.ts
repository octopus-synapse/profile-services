/**
 * Derives the work mode of an external posting. JSearch only exposes a
 * binary `job_is_remote` — hybrid arrangements are only ever mentioned
 * in free text, so anything not flagged remote is scanned for hybrid
 * keywords (PT/EN) before falling back to ONSITE.
 *
 * Keep the keyword stems in sync with the SQL backfill in
 * `prisma/migrations/20261102000000_add_external_job_work_mode_and_saved`.
 */

import type { RemotePolicy } from '@prisma/client';

// Stems match híbrido/híbrida/hibrido/hybrid/hybride after accent
// stripping; scanning stems keeps gendered/plural variants covered.
const HYBRID_STEMS = ['hibrid', 'hybrid'] as const;

export interface DeriveWorkModeInput {
  readonly isRemote: boolean;
  readonly title: string;
  readonly description: string | null;
}

export function deriveWorkMode(input: DeriveWorkModeInput): RemotePolicy {
  if (input.isRemote) return 'REMOTE';
  const haystack = normalize(`${input.title} ${input.description ?? ''}`);
  if (HYBRID_STEMS.some((stem) => haystack.includes(stem))) return 'HYBRID';
  return 'ONSITE';
}

/** Same normalization as `buildDedupHash`: accent-stripped lowercase. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
