/**
 * Outbound port for fetching Open Graph metadata from a URL.
 * Adapters can use the Fetch API or any HTTP client; the use case
 * doesn't care.
 */

import type { LinkPreviewData } from '../entities';

export abstract class LinkPreviewFetcherPort {
  abstract fetchPreview(url: string): Promise<LinkPreviewData | null>;
}
