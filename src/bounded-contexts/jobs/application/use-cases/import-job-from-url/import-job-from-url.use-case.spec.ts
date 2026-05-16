import { describe, expect, it } from 'bun:test';
import type { ExtractedJob, LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import {
  SafeFetchBlockedError,
  SafeFetchPort,
  type SafeFetchResponse,
} from '@/shared-kernel/http/safe-fetch.port';
import { JobImportInvalidUrlException } from '../../../domain/exceptions/jobs.exceptions';
import { JobImportService } from '../../services/job-import.service';
import { ImportJobFromUrlUseCase } from './import-job-from-url.use-case';

const fakeLlm: LlmPort = {
  extractJobFromText: async (_text: string): Promise<ExtractedJob> =>
    ({}) as unknown as ExtractedJob,
} as unknown as LlmPort;

/** SafeFetch stub that rejects metadata-style URLs to exercise the SSRF path. */
class StubSafeFetch extends SafeFetchPort {
  async fetch(url: string): Promise<SafeFetchResponse> {
    const u = new URL(url);
    if (u.hostname === '169.254.169.254' || u.hostname === 'localhost') {
      throw new SafeFetchBlockedError('blocked', 'private-ip');
    }
    return {
      status: 200,
      statusText: 'OK',
      ok: true,
      headers: new Headers(),
      async text() {
        return '<html><body>' + 'job description text '.repeat(20) + '</body></html>';
      },
    };
  }
}

describe('ImportJobFromUrlUseCase', () => {
  const buildUseCase = () =>
    new ImportJobFromUrlUseCase(new JobImportService(fakeLlm, new StubSafeFetch()));

  it('rejects non-http(s) URLs', async () => {
    const useCase = buildUseCase();
    await expect(useCase.execute('ftp://bad')).rejects.toBeInstanceOf(JobImportInvalidUrlException);
  });

  it('rejects malformed URLs', async () => {
    const useCase = buildUseCase();
    await expect(useCase.execute('not a url')).rejects.toBeInstanceOf(JobImportInvalidUrlException);
  });

  // P0-#9 SSRF regression: the AWS metadata IP must not be reachable, even
  // when wrapped in an http://-shaped URL.
  it('rejects AWS metadata URLs via SafeFetchPort', async () => {
    const useCase = buildUseCase();
    await expect(
      useCase.execute('http://169.254.169.254/latest/meta-data/'),
    ).rejects.toBeInstanceOf(JobImportInvalidUrlException);
  });

  it('rejects localhost URLs via SafeFetchPort', async () => {
    const useCase = buildUseCase();
    await expect(useCase.execute('http://localhost:5432/health')).rejects.toBeInstanceOf(
      JobImportInvalidUrlException,
    );
  });
});
