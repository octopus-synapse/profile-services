/**
 * Pure helper for extracting unique, lowercased hashtags from free text.
 * Used at post creation / repost-with-commentary time.
 */

export class HashtagParserService {
  parse(content: string | null | undefined): string[] {
    if (!content) return [];
    const matches = content.match(/#\w+/g);
    if (!matches) return [];
    return [...new Set(matches.map((tag) => tag.toLowerCase()))];
  }
}
