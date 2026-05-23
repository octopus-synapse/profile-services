/**
 * Pure helper for extracting unique, lowercased hashtags from free text.
 * Used at post creation / repost-with-commentary time.
 *
 * P2-#13: the pattern uses Unicode letter/number classes so non-ASCII
 * tags like `#brasília` extract as a single token instead of being cut
 * at the first accented character (`#bras`). A cap of 30 distinct tags
 * keeps a degenerate input — `'#a'.repeat(10000)` — from balooning the
 * downstream array / DB writes.
 */

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const MAX_HASHTAGS_PER_POST = 30;

export class HashtagParserService {
  parse(content: string | null | undefined): string[] {
    if (!content) return [];
    const matches = content.match(HASHTAG_RE);
    if (!matches) return [];
    const unique = [...new Set(matches.map((tag) => tag.toLowerCase()))];
    return unique.slice(0, MAX_HASHTAGS_PER_POST);
  }
}
