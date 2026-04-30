/**
 * Fetch-API adapter for `LinkPreviewFetcherPort`. Pulls a URL with a 5s
 * timeout, parses Open Graph tags via regex, and falls back to `<title>`
 * + `<meta name="description">` when OG tags are missing. All errors
 * are swallowed (returns `null`) so a flaky external page never breaks
 * post creation.
 */

import { LoggerPort } from '@/shared-kernel';
import type { LinkPreviewData } from '../../../domain/entities';
import { LinkPreviewFetcherPort } from '../../../domain/ports/link-preview-fetcher.port';

const CTX = 'FetchLinkPreviewAdapter';
const TIMEOUT_MS = 5000;

export class FetchLinkPreviewAdapter extends LinkPreviewFetcherPort {
  constructor(private readonly logger: LoggerPort) {
    super();
  }

  async fetchPreview(url: string): Promise<LinkPreviewData | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ProfileBot/1.0 (Link Preview)' },
      });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const html = await response.text();
      const domain = new URL(url).hostname;

      const title = this.extractOgTag(html, 'og:title') ?? this.extractTitle(html);
      const description =
        this.extractOgTag(html, 'og:description') ?? this.extractMetaDescription(html);
      const image = this.extractOgTag(html, 'og:image');

      return { title, description, image, domain };
    } catch (err) {
      this.logger.warn(
        `Link preview fetch failed for ${url}: ${err instanceof Error ? err.message : 'unknown'}`,
        CTX,
      );
      return null;
    }
  }

  private extractOgTag(html: string, property: string): string | null {
    const regex = new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[1];

    const regexReversed = new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
      'i',
    );
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : null;
  }

  private extractMetaDescription(html: string): string | null {
    const regex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i;
    const match = html.match(regex);
    if (match) return match[1];

    const regexReversed = /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i;
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }
}
