import type { Locale } from '@/shared-kernel/utils/locale-resolver.util';

/**
 * Which of our two languages a piece of prose is written in, from the prose
 * itself (ADR-003 §10, decision 18). A résumé imported from a PDF or a
 * LinkedIn export carries no language tag, and labelling it by the app's
 * language would be a guess about the person, not the text.
 *
 * Deterministic and free: counts the function words that only one of the
 * languages uses (articles, prepositions, conjunctions). Content words —
 * "software", "backend", "React" — are shared and say nothing. Returns
 * `null` when the text is too short or the counts tie, so the caller keeps
 * its own fallback rather than asserting a language it does not know.
 */
const PT = new Set([
  'e',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'com',
  'para',
  'por',
  'um',
  'uma',
  'os',
  'as',
  'ao',
  'à',
  'que',
  'não',
  'mais',
  'como',
  'sobre',
  'também',
  'desenvolvimento',
  'experiência',
  'formação',
  'atuação',
  'responsável',
]);

const EN = new Set([
  'and',
  'the',
  'of',
  'in',
  'on',
  'at',
  'with',
  'for',
  'by',
  'to',
  'an',
  'is',
  'are',
  'was',
  'were',
  'that',
  'this',
  'from',
  'as',
  'led',
  'built',
  'development',
  'experience',
  'education',
  'responsible',
]);

// Below this many function words the counts are noise.
const MIN_SIGNAL = 3;

export function detectLocale(text: string): Locale | null {
  const words = text.toLowerCase().match(/[\p{L}]+/gu) ?? [];
  let pt = 0;
  let en = 0;
  for (const word of words) {
    if (PT.has(word)) pt++;
    else if (EN.has(word)) en++;
  }
  if (pt + en < MIN_SIGNAL || pt === en) return null;
  return pt > en ? 'pt-BR' : 'en';
}
