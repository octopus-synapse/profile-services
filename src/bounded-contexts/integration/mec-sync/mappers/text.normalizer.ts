/**
 * Text Normalizer
 * Single Responsibility: Normalize text for database storage
 */

/**
 * Small Portuguese prepositions that should remain lowercase
 */
const LOWERCASE_PREPOSITIONS = [
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'para',
  'com',
];

/**
 * Normalize text: trim, title case, remove extra spaces
 * Handles Brazilian Portuguese conventions for proper nouns
 */
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
