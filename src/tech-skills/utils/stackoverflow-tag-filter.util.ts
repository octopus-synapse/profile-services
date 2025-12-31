/**
 * Stack Overflow Tag Filter Utilities
 * Specific utilities for filtering Stack Overflow tags
 */

import { isProgrammingLanguage, shouldSkipTag } from './tag-filter.util';

/**
 * Check if a tag should be included in Stack Overflow parsing
 */
export function shouldIncludeStackOverflowTag(tagName: string): boolean {
  // Skip programming languages (handled by GitHub Linguist)
  if (isProgrammingLanguage(tagName)) {
    return false;
  }

  // Skip tags that should be filtered out
  if (shouldSkipTag(tagName)) {
    return false;
  }

  return true;
}

/**
 * Check if a tag is a programming language
 * Re-exported for convenience
 */
export { isProgrammingLanguage };

/**
 * Check if a tag should be skipped
 * Re-exported for convenience
 */
export { shouldSkipTag };
