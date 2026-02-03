/**
 * Translation Batch Service Tests
 * Focus: Batch translation operations
 *
 * Key scenarios:
 * - Process texts in batches of 5
 * - Handle partial failures gracefully
 * - Return both successful and failed translations
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { TranslationBatchService } from './translation-batch.service';
import { TranslationCoreService } from './translation-core.service';

describe('TranslationBatchService', () => {
  let service: TranslationBatchService;
  let fakeCoreService: {
    translate: ReturnType<typeof mock>;
  };

  beforeEach(async () => {
    fakeCoreService = {
      translate: mock((text: string) =>
        Promise.resolve({ original: text, translated: `translated_${text}` }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationBatchService,
        { provide: TranslationCoreService, useValue: fakeCoreService },
      ],
    }).compile();

    service = module.get<TranslationBatchService>(TranslationBatchService);
  });

  describe('translateBatch', () => {
    it('should translate all texts successfully', async () => {
      const texts = ['hello', 'world', 'test'];

      const result = await service.translateBatch(texts, 'en', 'pt');

      expect(result.translations).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.translations[0].translated).toBe('translated_hello');
    });

    it('should process texts in batches of 5', async () => {
      const texts = Array(12)
        .fill('text')
        .map((t, i) => `${t}${i}`);

      await service.translateBatch(texts, 'en', 'pt');

      // Should have been called 12 times total
      expect(fakeCoreService.translate.mock.calls.length).toBe(12);
    });

    it('should handle partial failures', async () => {
      fakeCoreService.translate.mockImplementation((text: string) => {
        if (text === 'fail') {
          return Promise.reject(new Error('Translation failed'));
        }
        return Promise.resolve({ original: text, translated: `ok_${text}` });
      });

      const texts = ['good', 'fail', 'also_good'];

      const result = await service.translateBatch(texts, 'en', 'pt');

      expect(result.translations).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].text).toBe('fail');
      expect(result.failed[0].error).toBe('Translation failed');
    });

    it('should handle empty array', async () => {
      const result = await service.translateBatch([], 'en', 'pt');

      expect(result.translations).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should pass correct language parameters', async () => {
      await service.translateBatch(['test'], 'pt', 'en');

      expect(fakeCoreService.translate).toHaveBeenCalledWith(
        'test',
        'pt',
        'en',
      );
    });
  });
});
