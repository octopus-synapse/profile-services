/**
 * Text Normalizer — pure title-casing helper that respects Brazilian-
 * Portuguese conventions for prepositions ("Universidade de São Paulo"
 * stays mixed-case rather than becoming "Universidade De São Paulo").
 */

const LOWERCASE_PREPOSITIONS = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com'];

export function normalizeText(text: string | undefined): string {
  if (!text) return '';

  return text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (LOWERCASE_PREPOSITIONS.includes(lower)) {
        return lower;
      }
      return capitalize(word);
    })
    .join(' ');
}

function capitalize(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
