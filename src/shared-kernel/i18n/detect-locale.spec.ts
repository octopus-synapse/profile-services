import { describe, expect, it } from 'bun:test';
import { detectLocale } from './detect-locale';

describe('detectLocale', () => {
  it('recognises Portuguese prose by its function words', () => {
    expect(
      detectLocale(
        'Desenvolvedora backend com cinco anos de experiência em sistemas de pagamento. Responsável pela migração do monólito para microsserviços.',
      ),
    ).toBe('pt-BR');
  });

  it('recognises English prose by its function words', () => {
    expect(
      detectLocale(
        'Backend developer with five years of experience in payment systems. Led the migration of the monolith to microservices.',
      ),
    ).toBe('en');
  });

  it('does not guess from a bare stack list or a tie', () => {
    expect(detectLocale('React TypeScript Node.js PostgreSQL')).toBeNull();
    expect(detectLocale('')).toBeNull();
    expect(detectLocale('de and')).toBeNull();
  });

  it('is not fooled by shared content words', () => {
    expect(
      detectLocale('Software engineer at a fintech, focused on the checkout and the ledger.'),
    ).toBe('en');
  });
});
