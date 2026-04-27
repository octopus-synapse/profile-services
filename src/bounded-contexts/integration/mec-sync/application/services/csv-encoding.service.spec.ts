import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { CsvEncodingService } from './csv-encoding.service';

describe('CsvEncodingService', () => {
  const service = new CsvEncodingService(stubLogger);

  it('decodes valid UTF-8 buffers as UTF-8', () => {
    const buffer = Buffer.from('Universidade São Paulo', 'utf8');
    expect(service.decode(buffer)).toBe('Universidade São Paulo');
  });

  it('falls back to Latin-1 when UTF-8 decoding produces replacement chars', () => {
    const buffer = Buffer.from('S\xE3o Paulo', 'latin1');
    expect(service.decode(buffer)).toBe('São Paulo');
  });
});
