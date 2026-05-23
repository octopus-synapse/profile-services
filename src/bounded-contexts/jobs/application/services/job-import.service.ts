/**
 * Fetch a job posting URL and ask the LLM to extract structured fields.
 * Returns a preview the UI shows before the recruiter confirms and
 * persists via the normal POST /v1/jobs flow — we never create the job
 * here.
 *
 * URL/fetch failures are normalised to typed domain exceptions so the
 * controller layer can render a coherent error.
 */

import type { ExtractedJob } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { SafeFetchBlockedError, SafeFetchPort } from '@/shared-kernel/http/safe-fetch.port';
import {
  JobImportFetchFailedException,
  JobImportInvalidUrlException,
  JobImportPageTooThinException,
} from '../../domain/exceptions/jobs.exceptions';

const IMPORT_FETCH_TIMEOUT_MS = 20_000;
// Caps the LLM payload + bounds memory for the strip-HTML pass. ~800KB of
// text is the equivalent of the previous byte cap.
const IMPORT_MAX_HTML_CHARS = 800_000;

export interface JobImportResult {
  readonly source: string;
  readonly preview: ExtractedJob;
}

export class JobImportService {
  constructor(
    private readonly llm: LlmPort,
    /**
     * SSRF-defended fetch port (P0-#9). The raw `fetch` global was previously
     * used here and accepted any URL — CLAUDE.md mandates `SafeFetchPort` for
     * user-supplied URLs because the underlying call hits an LLM that can
     * surface response content in a preview.
     */
    private readonly safeFetch: SafeFetchPort,
  ) {}

  async importFromUrl(url: string): Promise<JobImportResult> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new JobImportInvalidUrlException();
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new JobImportInvalidUrlException();
    }

    let html: string;
    try {
      const res = await this.safeFetch.fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: { 'User-Agent': 'PatchCareersBot/1.0 (+https://patch.careers)' },
        timeoutMs: IMPORT_FETCH_TIMEOUT_MS,
      });
      if (!res.ok) {
        throw new JobImportFetchFailedException();
      }
      const body = await res.text();
      html = body.length > IMPORT_MAX_HTML_CHARS ? body.slice(0, IMPORT_MAX_HTML_CHARS) : body;
    } catch (err) {
      if (err instanceof JobImportFetchFailedException) throw err;
      // SafeFetch rejected the URL up front (protocol, private IP, DNS
      // rebinding, etc.) — surface as the existing "invalid URL" so the
      // controller maps to the same UX as a malformed link.
      if (err instanceof SafeFetchBlockedError) throw new JobImportInvalidUrlException();
      throw new JobImportFetchFailedException();
    }

    const text = stripHtml(html);
    if (text.trim().length < 50) {
      throw new JobImportPageTooThinException();
    }

    const preview = await this.llm.extractJobFromText(text);
    return { source: parsedUrl.toString(), preview };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
