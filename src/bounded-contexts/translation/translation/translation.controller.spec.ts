/**
 * Translation Controller Unit Tests
 *
 * Tests the translation controller endpoints.
 * Focus: Request handling, service delegation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TranslationController } from './translation.controller';
import type { TranslationService } from './translation.service';

describe('TranslationController', () => {
  let controller: TranslationController;
  let mockTranslationService: Partial<TranslationService>;

  beforeEach(() => {
    mockTranslationService = {
      checkServiceHealth: mock(() => Promise.resolve(true)),
      translate: mock(() =>
        Promise.resolve({ text: 'Hello', translatedText: 'Olá' }),
      ),
      translateBatch: mock(() =>
        Promise.resolve([
          { text: 'Hello', translatedText: 'Olá' },
          { text: 'World', translatedText: 'Mundo' },
        ]),
      ),
      translatePtToEn: mock(() =>
        Promise.resolve({ text: 'Olá', translatedText: 'Hello' }),
      ),
      translateEnToPt: mock(() =>
        Promise.resolve({ text: 'Hello', translatedText: 'Olá' }),
      ),
    };

    controller = new TranslationController(
      mockTranslationService as TranslationService,
    );
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is available', async () => {
      const result = await controller.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('opus-mt');
      expect(result.timestamp).toBeDefined();
    });

    it('should return unavailable status when service is down', async () => {
      (
        mockTranslationService.checkServiceHealth as ReturnType<typeof mock>
      ).mockResolvedValue(false);

      const result = await controller.healthCheck();

      expect(result.status).toBe('unavailable');
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

      expect(result.translatedText).toBe('Olá');
      expect(mockTranslationService.translate).toHaveBeenCalledWith(
        'Hello',
        'en',
        'pt',
      );
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

      expect(result).toHaveLength(2);
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

      expect(result.translatedText).toBe('Hello');
      expect(mockTranslationService.translatePtToEn).toHaveBeenCalledWith(
        'Olá',
      );
    });
  });

  describe('translateEnToPt', () => {
    it('should translate English to Portuguese', async () => {
      const result = await controller.translateEnToPt('Hello');

      expect(result.translatedText).toBe('Olá');
      expect(mockTranslationService.translateEnToPt).toHaveBeenCalledWith(
        'Hello',
      );
    });
  });
});
