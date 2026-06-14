import { describe, expect, it } from 'bun:test';
import { deriveWorkMode } from './derive-work-mode';

describe('deriveWorkMode', () => {
  it('returns REMOTE whenever the upstream remote flag is set', () => {
    expect(
      deriveWorkMode({ isRemote: true, title: 'Dev híbrido', description: null }),
    ).toBe('REMOTE');
  });

  it('detects hybrid from the title (accented PT)', () => {
    expect(
      deriveWorkMode({ isRemote: false, title: 'Desenvolvedor — modelo Híbrido', description: null }),
    ).toBe('HYBRID');
  });

  it('detects hybrid from the description (EN + unaccented PT variants)', () => {
    expect(
      deriveWorkMode({ isRemote: false, title: 'Dev', description: 'Hybrid work model, 2 office days' }),
    ).toBe('HYBRID');
    expect(
      deriveWorkMode({ isRemote: false, title: 'Dev', description: 'trabalho hibrido em SP' }),
    ).toBe('HYBRID');
    expect(
      deriveWorkMode({ isRemote: false, title: 'Dev', description: 'vaga híbrida (3x presencial)' }),
    ).toBe('HYBRID');
  });

  it('falls back to ONSITE when nothing signals remote or hybrid', () => {
    expect(
      deriveWorkMode({ isRemote: false, title: 'Dev Backend', description: 'Presencial em SP' }),
    ).toBe('ONSITE');
    expect(deriveWorkMode({ isRemote: false, title: 'Dev', description: null })).toBe('ONSITE');
  });
});
