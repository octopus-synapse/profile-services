/**
 * Translate Text Use Case Tests
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  TranslationBackendUnavailableException,
  TranslationPayloadTooLargeException,
  UnsupportedLocalePairException,
} from '../../../domain/exceptions/translation.exceptions';
import { TranslateTextUseCase } from './translate-text.use-case';

describe('TranslateTextUseCase', () => {
  let useCase: TranslateTextUseCase;
  let fakeTranslationService: { translate: ReturnType<typeof mock> };

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

  it('throws UnsupportedLocalePairException for an unknown source language', async () => {
    await expect(useCase.execute('Hello', 'fr' as never, 'pt')).rejects.toBeInstanceOf(
      UnsupportedLocalePairException,
    );
  });

  it('throws UnsupportedLocalePairException for an unknown target language', async () => {
    await expect(useCase.execute('Hello', 'en', 'es' as never)).rejects.toBeInstanceOf(
      UnsupportedLocalePairException,
    );
  });

  it('throws TranslationPayloadTooLargeException when text is over the cap', async () => {
    const huge = 'a'.repeat(50_001);
    await expect(useCase.execute(huge, 'en', 'pt')).rejects.toBeInstanceOf(
      TranslationPayloadTooLargeException,
    );
  });

  it('wraps backend failures in TranslationBackendUnavailableException', async () => {
    fakeTranslationService.translate.mockImplementationOnce(() =>
      Promise.reject(new Error('connection refused')),
    );

    await expect(useCase.execute('Hello', 'en', 'pt')).rejects.toBeInstanceOf(
      TranslationBackendUnavailableException,
    );
  });
});
