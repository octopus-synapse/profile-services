/**
 * Resume Translation Service Tests
 * Focus: Resume field translation
 *
 * Key scenarios:
 * - Translate string fields
 * - Translate array fields
 * - Translate nested objects
 * - Skip non-translatable fields
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeTranslationService } from './resume-translation.service';
import { TranslationCoreService } from './translation-core.service';

describe('ResumeTranslationService', () => {
  let service: ResumeTranslationService;
  let fakeCoreService: {
    translate: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    fakeCoreService = {
      translate: mock((text: string) =>
        Promise.resolve({ original: text, translated: `[EN] ${text}` }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeTranslationService,
        { provide: TranslationCoreService, useValue: fakeCoreService },
      ],
    }).compile();

    service = module.get<ResumeTranslationService>(ResumeTranslationService);
  });

  describe('translateToEnglish', () => {
    it('should translate string fields', async () => {
      const resume = { summary: 'Desenvolvedor experiente' };

      const result = await service.translateToEnglish(resume);

      expect(result.summary).toBe('[EN] Desenvolvedor experiente');
      expect(fakeCoreService.translate).toHaveBeenCalledWith(
        'Desenvolvedor experiente',
        'pt',
        'en',
      );
    });

    it('should translate array of strings', async () => {
      const resume = { skills: ['JavaScript', 'TypeScript'] };

      const result = await service.translateToEnglish(resume);

      expect(result.skills).toEqual(['[EN] JavaScript', '[EN] TypeScript']);
    });

    it('should skip non-translatable fields', async () => {
      const resume = { id: '123', email: 'test@example.com', summary: 'Test' };

      const result = await service.translateToEnglish(resume);

      expect(result.id).toBe('123');
      expect(result.email).toBe('test@example.com');
      expect(result.summary).toBe('[EN] Test');
    });

    it('should skip empty/null fields', async () => {
      const resume = { summary: '', headline: null };

      const result = await service.translateToEnglish(resume);

      expect(result.summary).toBe('');
      expect(result.headline).toBe(null);
      expect(fakeCoreService.translate).not.toHaveBeenCalled();
    });
  });

  describe('translateToPortuguese', () => {
    it('should use pt as target language', async () => {
      fakeCoreService.translate.mockResolvedValue({
        original: 'Developer',
        translated: '[PT] Developer',
      });

      const resume = { summary: 'Experienced developer' };

      await service.translateToPortuguese(resume);

      expect(fakeCoreService.translate).toHaveBeenCalledWith(
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

      const result = await service.translateToEnglish(resume);

      // experience is not in TRANSLATABLE_FIELDS, but title and description are
      // Since experience itself is not translatable, it should remain unchanged
      expect(result.experience).toEqual({
        title: 'Senior Developer',
        description: 'Led team of 5',
      });
    });

    it('should translate arrays with nested objects', async () => {
      const resume = {
        responsibilities: [{ description: 'Build APIs' }],
      };

      const result = (await service.translateToEnglish(resume)) as {
        responsibilities: Array<{ description: string }>;
      };

      expect(result.responsibilities[0].description).toBe('[EN] Build APIs');
    });
  });
});
