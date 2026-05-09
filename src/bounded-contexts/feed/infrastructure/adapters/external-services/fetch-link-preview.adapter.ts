/**
 * Fetch-API adapter for `LinkPreviewFetcherPort`. Pulls a URL with a 5s
 * timeout, parses Open Graph tags via regex, and falls back to `<title>`
 * + `<meta name="description">` when OG tags are missing. All errors
 * are swallowed (returns `null`) so a flaky external page never breaks
 * post creation.
 *
 * P0-013: routes the fetch through `SafeFetchPort` so user-supplied URLs
 * cannot reach loopback / RFC1918 / link-local addresses (AWS metadata
 * service, etc.) or non-HTTP protocols (`file://`, `data:`).
 */

import { LoggerPort, SafeFetchBlockedError, type SafeFetchPort } from '@/shared-kernel';
import type { LinkPreviewData } from '../../../domain/entities';
import { LinkPreviewFetcherPort } from '../../../domain/ports/link-preview-fetcher.port';

const CTX = 'FetchLinkPreviewAdapter';
const TIMEOUT_MS = 5000;

export class FetchLinkPreviewAdapter extends LinkPreviewFetcherPort {
  constructor(
    private readonly logger: LoggerPort,
    private readonly safeFetch: SafeFetchPort,
  ) {
    super();
  }

  async fetchPreview(url: string): Promise<LinkPreviewData | null> {
    try {
      const response = await this.safeFetch.fetch(url, {
        timeoutMs: TIMEOUT_MS,
        headers: { 'User-Agent': 'ProfileBot/1.0 (Link Preview)' },
      });

      if (!response.ok) return null;

      const html = await response.text();
      const domain = new URL(url).hostname;

      const title = this.extractOgTag(html, 'og:title') ?? this.extractTitle(html);
      const description =
        this.extractOgTag(html, 'og:description') ?? this.extractMetaDescription(html);
      const image = this.extractOgTag(html, 'og:image');

      return { title, description, image, domain };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      if (err instanceof SafeFetchBlockedError) {
        this.logger.warn(`Link preview blocked by safe-fetch (${err.reason}): ${message}`, CTX);
      } else {
        this.logger.warn(`Link preview fetch failed: ${message}`, CTX);
      }
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
