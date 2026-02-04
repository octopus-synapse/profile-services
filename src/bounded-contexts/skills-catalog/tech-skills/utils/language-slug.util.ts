/**
 * Language Slug Utility
 * Creates URL-safe slugs from language names
 */

/**
 * Create URL-safe slug from language name
 * Handles special characters like # and +
 */
export function createLanguageSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[#+]+/g, (match) => {
      if (match === '#') return 'sharp';
      if (match === '++') return 'plusplus';
      if (match === '+') return 'plus';
      return '';
    })
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
