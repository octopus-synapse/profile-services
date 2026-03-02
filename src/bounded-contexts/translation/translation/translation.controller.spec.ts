/**
 * Translation Controller Unit Tests
 *
 * Tests the translation controller endpoints.
 * Focus: Request handling, service delegation.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TranslationController } from './translation.controller';
import type { TranslationService } from './translation.service';
import type {
  TranslationLanguage,
  TranslationResult,
} from './types/translation.types';

describe('TranslationController', () => {
  let controller: TranslationController;
  let mockTranslationService: Partial<TranslationService>;

  // Helper que retorna o tipo exato que o serviço espera (TranslationResult)
  const createTranslationResult = (
    original: string,
    translated: string,
    sourceLanguage: TranslationLanguage = 'en',
    targetLanguage: TranslationLanguage = 'pt',
  ): TranslationResult => ({
    original,
    translated,
    sourceLanguage,
    targetLanguage,
  });

  beforeEach(() => {
    mockTranslationService = {
      checkServiceHealth: mock(() => Promise.resolve(true)),

      // Agora os mocks retornam TranslationResult, não TranslationResultDto
      translate: mock(
        (
          text: string,
          source: TranslationLanguage,
          target: TranslationLanguage,
        ) =>
          Promise.resolve(
            createTranslationResult(
              text,
              text === 'Hello' ? 'Olá' : 'Mundo',
              source,
              target,
            ),
          ),
      ),

      translateBatch: mock(
        (
          texts: string[],
          source: TranslationLanguage,
          target: TranslationLanguage,
        ) =>
          Promise.resolve({
            translations: texts.map((text) =>
              createTranslationResult(
                text,
                text === 'Hello' ? 'Olá' : 'Mundo',
                source,
                target,
              ),
            ),
            failed: [],
          }),
      ),

      translatePtToEn: mock((text: string) =>
        Promise.resolve(createTranslationResult(text, 'Hello', 'pt', 'en')),
      ),

      translateEnToPt: mock((text: string) =>
        Promise.resolve(createTranslationResult(text, 'Olá', 'en', 'pt')),
      ),
    };

    controller = new TranslationController(
      mockTranslationService as TranslationService,
    );
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is available', async () => {
      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('healthy');
      expect(result.data?.timestamp).toBeDefined();
    });

    it('should return unavailable status when service is down', async () => {
      (
        mockTranslationService.checkServiceHealth as ReturnType<typeof mock>
      ).mockResolvedValue(false);

      const result = await controller.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('unavailable');
    });
  });

  describe('translateText', () => {
    it('should translate single text', async () => {
      const dto = {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'pt',
      };

      const result = await controller.translateText(dto);

      expect(result.success).toBe(true);
      expect(result.data?.translated).toBe('Olá');
      expect(result.data?.original).toBe('Hello');
      expect(result.data?.sourceLanguage).toBe('en');
      expect(result.data?.targetLanguage).toBe('pt');

      // Verifica se foi chamado com os parâmetros corretos
      expect(mockTranslationService.translate).toHaveBeenCalledWith(
        'Hello',
        'en',
        'pt',
      );
    });

    it('should handle different language pairs', async () => {
      const dto = {
        text: 'Bonjour',
        sourceLanguage: 'fr',
        targetLanguage: 'de',
      };

      const result = await controller.translateText(dto);

      expect(result.success).toBe(true);
      expect(result.data?.sourceLanguage).toBe('fr');
      expect(result.data?.targetLanguage).toBe('de');
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const dto = {
        texts: ['Hello', 'World'],
        sourceLanguage: 'en',
        targetLanguage: 'pt',
      };

      const result = await controller.translateBatch(dto);

      expect(result.success).toBe(true);
      expect(result.data?.translations).toBeDefined();
      expect(result.data?.translations).toHaveLength(2);
      expect(result.data?.translations[0].translated).toBe('Olá');
      expect(result.data?.translations[1].translated).toBe('Mundo');
      expect(result.data?.translations[0].sourceLanguage).toBe('en');
      expect(result.data?.translations[0].targetLanguage).toBe('pt');

      expect(mockTranslationService.translateBatch).toHaveBeenCalledWith(
        ['Hello', 'World'],
        'en',
        'pt',
      );
    });
  });

  describe('translatePtToEn', () => {
    it('should translate Portuguese to English', async () => {
      const result = await controller.translatePtToEn('Olá');

      expect(result.success).toBe(true);
      expect(result.data?.translated).toBe('Hello');
      expect(result.data?.original).toBe('Olá');
      expect(result.data?.sourceLanguage).toBe('pt');
      expect(result.data?.targetLanguage).toBe('en');
      expect(mockTranslationService.translatePtToEn).toHaveBeenCalledWith(
        'Olá',
      );
    });
  });

  describe('translateEnToPt', () => {
    it('should translate English to Portuguese', async () => {
      const result = await controller.translateEnToPt('Hello');

      expect(result.success).toBe(true);
      expect(result.data?.translated).toBe('Olá');
      expect(result.data?.original).toBe('Hello');
      expect(result.data?.sourceLanguage).toBe('en');
      expect(result.data?.targetLanguage).toBe('pt');
      expect(mockTranslationService.translateEnToPt).toHaveBeenCalledWith(
        'Hello',
      );
    });
  });
});
