/**
 * In-memory `LinkPreviewFetcherPort` for use-case specs.
 */

import type { LinkPreviewData } from '../domain/entities';
import { LinkPreviewFetcherPort } from '../domain/ports/link-preview-fetcher.port';

export class InMemoryLinkPreviewFetcher extends LinkPreviewFetcherPort {
  readonly previews = new Map<string, LinkPreviewData>();

  set(url: string, data: LinkPreviewData): void {
    this.previews.set(url, data);
  }

  async fetchPreview(url: string): Promise<LinkPreviewData | null> {
    return this.previews.get(url) ?? null;
  }
}
