import { describe, expect, it } from 'bun:test';
import type { ExtractedJob, LlmPort } from '@/bounded-contexts/ai/domain/ports/llm.port';
import { JobImportInvalidUrlException } from '../../../domain/exceptions/jobs.exceptions';
import { JobImportService } from '../../services/job-import.service';
import { ImportJobFromUrlUseCase } from './import-job-from-url.use-case';

const fakeLlm: LlmPort = {
  extractJobFromText: async (_text: string): Promise<ExtractedJob> =>
    ({}) as unknown as ExtractedJob,
} as unknown as LlmPort;

describe('ImportJobFromUrlUseCase', () => {
  it('rejects non-http(s) URLs', async () => {
    const useCase = new ImportJobFromUrlUseCase(new JobImportService(fakeLlm));
    await expect(useCase.execute('ftp://bad')).rejects.toBeInstanceOf(JobImportInvalidUrlException);
  });

  it('rejects malformed URLs', async () => {
    const useCase = new ImportJobFromUrlUseCase(new JobImportService(fakeLlm));
    await expect(useCase.execute('not a url')).rejects.toBeInstanceOf(JobImportInvalidUrlException);
  });
});
