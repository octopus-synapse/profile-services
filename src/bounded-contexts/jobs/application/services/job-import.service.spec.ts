import { describe, expect, it } from 'bun:test';
import type { ExtractedJob, LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { SafeFetchPort, type SafeFetchResponse } from '@/shared-kernel/http/safe-fetch.port';
import { JobImportInvalidUrlException } from '../../domain/exceptions/jobs.exceptions';
import { JobImportService } from './job-import.service';

const fakeLlm: LlmPort = {
  extractJobFromText: async (_text: string): Promise<ExtractedJob> =>
    ({}) as unknown as ExtractedJob,
} as unknown as LlmPort;

class NoopSafeFetch extends SafeFetchPort {
  async fetch(): Promise<SafeFetchResponse> {
    return {
      status: 200,
      statusText: 'OK',
      ok: true,
      headers: new Headers(),
      async text() {
        return '';
      },
    };
  }
}

const noopSafeFetch = new NoopSafeFetch();

describe('JobImportService', () => {
  it('rejects an empty / non-URL string', async () => {
    await expect(
      new JobImportService(fakeLlm, noopSafeFetch).importFromUrl('not a url'),
    ).rejects.toBeInstanceOf(JobImportInvalidUrlException);
  });

  it('rejects non-http(s) protocols', async () => {
    await expect(
      new JobImportService(fakeLlm, noopSafeFetch).importFromUrl('ftp://example.com'),
    ).rejects.toBeInstanceOf(JobImportInvalidUrlException);
  });
});
