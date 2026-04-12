/**
 * Translate Resume Use Case Tests
 * Focus: Resume field translation
 *
 * Key scenarios:
 * - Translate string fields
 * - Translate array fields
 * - Translate nested objects
 * - Skip non-translatable fields
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { TranslateResumeUseCase } from './translate-resume.use-case';

describe('TranslateResumeUseCase', () => {
  let useCase: TranslateResumeUseCase;
  let fakeTranslationService: {
    translate: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    fakeTranslationService = {
      translate: mock((text: string) =>
        Promise.resolve({ original: text, translated: `[EN] ${text}` }),
      ),
    };

    useCase = new TranslateResumeUseCase(fakeTranslationService as never);
  });

  describe('translateToEnglish (pt-to-en)', () => {
    it('should translate string fields', async () => {
      const resume = { summary: 'Desenvolvedor experiente' };

      const result = await useCase.execute(resume, 'pt-to-en');

      expect(result.summary).toBe('[EN] Desenvolvedor experiente');
      expect(fakeTranslationService.translate).toHaveBeenCalledWith(
        'Desenvolvedor experiente',
        'pt',
        'en',
      );
    });

    it('should translate array of strings', async () => {
      const resume = { skills: ['JavaScript', 'TypeScript'] };

      const result = await useCase.execute(resume, 'pt-to-en');

      expect(result.skills).toEqual(['[EN] JavaScript', '[EN] TypeScript']);
    });

    it('should skip non-translatable fields', async () => {
      const resume = { id: '123', email: 'test@example.com', summary: 'Test' };

      const result = await useCase.execute(resume, 'pt-to-en');

      expect(result.id).toBe('123');
      expect(result.email).toBe('test@example.com');
      expect(result.summary).toBe('[EN] Test');
    });

    it('should skip empty/null fields', async () => {
      const resume = { summary: '', headline: null };

      const result = await useCase.execute(resume, 'pt-to-en');

      expect(result.summary).toBe('');
      expect(result.headline).toBe(null);
      expect(fakeTranslationService.translate).not.toHaveBeenCalled();
    });
  });

  describe('translateToPortuguese (en-to-pt)', () => {
    it('should use pt as target language', async () => {
      fakeTranslationService.translate.mockResolvedValue({
        original: 'Developer',
        translated: '[PT] Developer',
      });

      const resume = { summary: 'Experienced developer' };

      await useCase.execute(resume, 'en-to-pt');

      expect(fakeTranslationService.translate).toHaveBeenCalledWith(
        'Experienced developer',
        'en',
        'pt',
      );
    });
  });

  describe('nested objects', () => {
    it('should translate nested object fields', async () => {
      const resume = {
        experience: {
          title: 'Senior Developer',
          description: 'Led team of 5',
        },
      };

      const result = await useCase.execute(resume, 'pt-to-en');

      expect(result.experience).toEqual({
        title: '[EN] Senior Developer',
        description: '[EN] Led team of 5',
      });
    });

    it('should translate arrays with nested objects', async () => {
      const resume = {
        responsibilities: [{ description: 'Build APIs' }],
      };

      const result = (await useCase.execute(resume, 'pt-to-en')) as {
        responsibilities: Array<{ description: string }>;
      };

      expect(result.responsibilities[0].description).toBe('[EN] Build APIs');
    });
  });
});
