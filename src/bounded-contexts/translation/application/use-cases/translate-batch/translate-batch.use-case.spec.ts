/**
 * Translate Batch Use Case Tests
 * Focus: Batch translation operations
 *
 * Key scenarios:
 * - Process texts in batches of 5
 * - Handle partial failures gracefully
 * - Return both successful and failed translations
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { TranslateBatchUseCase } from './translate-batch.use-case';

describe('TranslateBatchUseCase', () => {
  let useCase: TranslateBatchUseCase;
  let fakeTranslationService: {
    translate: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    fakeTranslationService = {
      translate: mock((text: string) =>
        Promise.resolve({ original: text, translated: `translated_${text}` }),
      ),
    };

    useCase = new TranslateBatchUseCase(fakeTranslationService as never);
  });

  describe('execute', () => {
    it('should translate all texts successfully', async () => {
      const texts = ['hello', 'world', 'test'];

      const result = await useCase.execute(texts, 'en', 'pt');

      expect(result.translations).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.translations[0].translated).toBe('translated_hello');
    });

    it('should process texts in batches of 5', async () => {
      const texts = Array(12)
        .fill('text')
        .map((t, i) => `${t}${i}`);

      await useCase.execute(texts, 'en', 'pt');

      // Should have been called 12 times total
      expect(fakeTranslationService.translate.mock.calls.length).toBe(12);
    });

    it('should handle partial failures', async () => {
      fakeTranslationService.translate.mockImplementation((text: string) => {
        if (text === 'fail') {
          return Promise.reject(new Error('Translation failed'));
        }
        return Promise.resolve({ original: text, translated: `ok_${text}` });
      });

      const texts = ['good', 'fail', 'also_good'];

      const result = await useCase.execute(texts, 'en', 'pt');

      expect(result.translations).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].text).toBe('fail');
      expect(result.failed[0].error).toBe('Translation failed');
    });

    it('should handle empty array', async () => {
      const result = await useCase.execute([], 'en', 'pt');

      expect(result.translations).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should pass correct language parameters', async () => {
      await useCase.execute(['test'], 'pt', 'en');

      expect(fakeTranslationService.translate).toHaveBeenCalledWith('test', 'pt', 'en');
    });
  });
});
