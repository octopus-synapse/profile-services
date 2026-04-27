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
import {
  JobImportFetchFailedException,
  JobImportInvalidUrlException,
  JobImportPageTooThinException,
} from '../../domain/exceptions/jobs.exceptions';

const IMPORT_FETCH_TIMEOUT_MS = 20_000;
const IMPORT_MAX_HTML_BYTES = 800_000;

export interface JobImportResult {
  readonly source: string;
  readonly preview: ExtractedJob;
}

export class JobImportService {
  constructor(private readonly llm: LlmPort) {}

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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMPORT_FETCH_TIMEOUT_MS);
    let html: string;
    try {
      const res = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'PatchCareersBot/1.0 (+https://patch.careers)' },
        redirect: 'follow',
      });
      if (!res.ok) {
        throw new JobImportFetchFailedException();
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      const slice =
        buf.byteLength > IMPORT_MAX_HTML_BYTES ? buf.slice(0, IMPORT_MAX_HTML_BYTES) : buf;
      html = new TextDecoder('utf-8', { fatal: false }).decode(slice);
    } catch (err) {
      if (err instanceof JobImportFetchFailedException) throw err;
      throw new JobImportFetchFailedException();
    } finally {
      clearTimeout(timer);
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
