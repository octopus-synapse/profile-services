/**
 * Link Preview Service
 *
 * Fetches URL metadata (Open Graph tags) for link previews.
 * Returns structured preview data or null on failure.
 */

import { Injectable } from '@nestjs/common';

export interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string;
}

@Injectable()
export class LinkPreviewService {
  /**
   * Fetch Open Graph metadata from a URL.
   * Uses 5s timeout, catches all errors silently (returns null).
   */
  async fetchPreview(url: string): Promise<LinkPreviewData | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ProfileBot/1.0 (Link Preview)',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const domain = new URL(url).hostname;

      const title = this.extractOgTag(html, 'og:title') ?? this.extractTitle(html);
      const description =
        this.extractOgTag(html, 'og:description') ?? this.extractMetaDescription(html);
      const image = this.extractOgTag(html, 'og:image');

      return { title, description, image, domain };
    } catch {
      return null;
    }
  }

  /**
   * Extract an Open Graph meta tag value from HTML.
   */
  private extractOgTag(html: string, property: string): string | null {
    const regex = new RegExp(
      `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[1];

    // Try reversed attribute order (content before property)
    const regexReversed = new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
      'i',
    );
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }

  /**
   * Fallback: extract <title> tag.
   */
  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Fallback: extract meta description.
   */
  private extractMetaDescription(html: string): string | null {
    const regex = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i;
    const match = html.match(regex);
    if (match) return match[1];

    const regexReversed = /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i;
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }
}
