/**
 * Translation Service (Facade) Tests
 * Focus: Unified API delegation to specialized services
 *
 * Key scenarios:
 * - Delegates to core service for single translations
 * - Delegates to batch service for batch operations
 * - Delegates to resume service for resume translations
 * - Reports service availability
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ResumeTranslationService } from './resume-translation.service';
import { TranslationService } from './translation.service';
import type { TranslationCoreService } from './translation-core.service';

describe('TranslationService (Facade)', () => {
  let service: TranslationService;
  let fakeCoreService: {
    translate: ReturnType<typeof mock>;
    checkServiceHealth: ReturnType<typeof mock>;
    isAvailable: ReturnType<typeof mock>;
  };
  let fakeResumeService: {
    translateToEnglish: ReturnType<typeof mock>;
    translateToPortuguese: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    fakeCoreService = {
      translate: mock((text: string) =>
        Promise.resolve({ original: text, translated: `[translated] ${text}` }),
      ),
      checkServiceHealth: mock(() => Promise.resolve(true)),
      isAvailable: mock(() => true),
    };

    fakeResumeService = {
      translateToEnglish: mock((data: Record<string, unknown>) =>
        Promise.resolve({ ...data, _translated: 'en' }),
      ),
      translateToPortuguese: mock((data: Record<string, unknown>) =>
        Promise.resolve({ ...data, _translated: 'pt' }),
      ),
    };

    service = new TranslationService(
      fakeCoreService as unknown as TranslationCoreService,
      fakeResumeService as unknown as ResumeTranslationService,
    );
  });

  describe('translate', () => {
    it('should delegate to core service', async () => {
      const result = await service.translate('Hello', 'en', 'pt');

      expect(fakeCoreService.translate).toHaveBeenCalledWith('Hello', 'en', 'pt');
      expect(result.translated).toBe('[translated] Hello');
    });
  });

  describe('translateResumeToEnglish', () => {
    it('should delegate to resume service', async () => {
      const resume = { summary: 'Test' };

      const result = await service.translateResumeToEnglish(resume);

      expect(fakeResumeService.translateToEnglish).toHaveBeenCalledWith(resume);
      expect(result._translated).toBe('en');
    });
  });

  describe('translateResumeToPortuguese', () => {
    it('should delegate to resume service', async () => {
      const resume = { summary: 'Test' };

      const result = await service.translateResumeToPortuguese(resume);

      expect(fakeResumeService.translateToPortuguese).toHaveBeenCalledWith(resume);
      expect(result._translated).toBe('pt');
    });
  });

  describe('checkServiceHealth', () => {
    it('should delegate to core service', async () => {
      const result = await service.checkServiceHealth();

      expect(fakeCoreService.checkServiceHealth).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should delegate to core service', () => {
      const result = service.isAvailable();

      expect(fakeCoreService.isAvailable).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when service unavailable', () => {
      fakeCoreService.isAvailable.mockReturnValue(false);

      const result = service.isAvailable();

      expect(result).toBe(false);
    });
  });
});
