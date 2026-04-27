/**
 * Open Graph metadata captured for rich link cards in posts.
 */

export interface LinkPreviewData {
  readonly title: string | null;
  readonly description: string | null;
  readonly image: string | null;
  readonly domain: string;
}
