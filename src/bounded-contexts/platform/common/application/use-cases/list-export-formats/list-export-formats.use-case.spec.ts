import { describe, expect, it } from 'bun:test';
import { ListExportFormatsUseCase } from './list-export-formats.use-case';

describe('ListExportFormatsUseCase', () => {
  it('returns the supported export formats', async () => {
    const result = await new ListExportFormatsUseCase().execute();
    expect(result).toEqual(['PDF', 'DOCX', 'JSON']);
  });
});
