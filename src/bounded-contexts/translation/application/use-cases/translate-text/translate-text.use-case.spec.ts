/**
 * Translate Text Use Case Tests
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { TranslateTextUseCase } from './translate-text.use-case';

describe('TranslateTextUseCase', () => {
  let useCase: TranslateTextUseCase;
  let fakeTranslationService: {
    translate: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    fakeTranslationService = {
      translate: mock((text: string) =>
        Promise.resolve({
          original: text,
          translated: `[translated] ${text}`,
          sourceLanguage: 'en',
          targetLanguage: 'pt',
        }),
      ),
    };

    useCase = new TranslateTextUseCase(fakeTranslationService as never);
  });

  it('should delegate to translation service', async () => {
    const result = await useCase.execute('Hello', 'en', 'pt');

    expect(fakeTranslationService.translate).toHaveBeenCalledWith('Hello', 'en', 'pt');
    expect(result.translated).toBe('[translated] Hello');
  });

  it('should support pt to en', async () => {
    await useCase.execute('Olá', 'pt', 'en');

    expect(fakeTranslationService.translate).toHaveBeenCalledWith('Olá', 'pt', 'en');
  });

  it('should support en to pt', async () => {
    await useCase.execute('Hello', 'en', 'pt');

    expect(fakeTranslationService.translate).toHaveBeenCalledWith('Hello', 'en', 'pt');
  });
});
