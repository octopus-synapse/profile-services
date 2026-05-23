import { describe, expect, it } from 'bun:test';
import { ListExportFormatsUseCase } from './list-export-formats.use-case';

describe('ListExportFormatsUseCase', () => {
  it('returns the supported export format descriptors with metadata', async () => {
    const result = await new ListExportFormatsUseCase().execute();
    expect(result.map((f) => f.key)).toEqual(['pdf', 'docx', 'json', 'latex']);
    expect(result.every((f) => f.label && f.mimeType && f.extension)).toBe(true);
    expect(result.every((f) => f.enabled)).toBe(true);
  });
});
