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
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeTranslationService } from './resume-translation.service';
import { TranslationBatchService } from './translation-batch.service';
import { TranslationCoreService } from './translation-core.service';
import { TranslationService } from './translation.service';

describe('TranslationService (Facade)', () => {
  let service: TranslationService;
  let fakeCoreService: {
    translate: ReturnType<typeof mock>;
    checkServiceHealth: ReturnType<typeof mock>;
    isAvailable: ReturnType<typeof mock>;
  };
  let fakeBatchService: {
    translateBatch: ReturnType<typeof mock>;
  };
  let fakeResumeService: {
    translateToEnglish: ReturnType<typeof mock>;
    translateToPortuguese: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    fakeCoreService = {
      translate: mock((text: string) =>
        Promise.resolve({ original: text, translated: `[translated] ${text}` }),
      ),
      checkServiceHealth: mock(() => Promise.resolve(true)),
      isAvailable: mock(() => true),
    };

    fakeBatchService = {
      translateBatch: mock((texts: string[]) =>
        Promise.resolve({
          translations: texts.map((t) => ({ original: t, translated: `[batch] ${t}` })),
          failed: [],
        }),
      ),
    };

    fakeResumeService = {
      translateToEnglish: mock((data: Record<string, unknown>) =>
        Promise.resolve({ ...data, _translated: 'en' }),
      ),
      translateToPortuguese: mock((data: Record<string, unknown>) =>
        Promise.resolve({ ...data, _translated: 'pt' }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: TranslationCoreService, useValue: fakeCoreService },
        { provide: TranslationBatchService, useValue: fakeBatchService },
        { provide: ResumeTranslationService, useValue: fakeResumeService },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
  });

  describe('translate', () => {
    it('should delegate to core service', async () => {
      const result = await service.translate('Hello', 'en', 'pt');

      expect(fakeCoreService.translate).toHaveBeenCalledWith('Hello', 'en', 'pt');
      expect(result.translated).toBe('[translated] Hello');
    });
  });

  describe('translatePtToEn', () => {
    it('should delegate with pt->en languages', async () => {
      await service.translatePtToEn('Olá');

      expect(fakeCoreService.translate).toHaveBeenCalledWith('Olá', 'pt', 'en');
    });
  });

  describe('translateEnToPt', () => {
    it('should delegate with en->pt languages', async () => {
      await service.translateEnToPt('Hello');

      expect(fakeCoreService.translate).toHaveBeenCalledWith('Hello', 'en', 'pt');
    });
  });

  describe('translateBatch', () => {
    it('should delegate to batch service', async () => {
      const texts = ['Hello', 'World'];

      const result = await service.translateBatch(texts, 'en', 'pt');

      expect(fakeBatchService.translateBatch).toHaveBeenCalledWith(texts, 'en', 'pt');
      expect(result.translations).toHaveLength(2);
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
