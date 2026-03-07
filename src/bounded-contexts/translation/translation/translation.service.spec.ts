/**
 * TranslationService Unit Tests
 *
 * Tests the orchestration of translation services.
 * Pure Bun tests with typed stubs - no NestJS testing utilities.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { ResumeTranslationService } from './services/resume-translation.service';
import type { TranslationBatchService } from './services/translation-batch.service';
import type { TranslationCoreService } from './services/translation-core.service';
import { TranslationService } from './translation.service';
import type {
  BatchTranslationResult,
  TranslationLanguage,
  TranslationResult,
} from './types/translation.types';

// ============================================================================
// Stub Services - track calls and return configured results
// ============================================================================

class StubTranslationCoreService implements Partial<TranslationCoreService> {
  calls: Array<{ method: string; args: unknown[] }> = [];
  private healthResult = true;
  private availableResult = true;
  private translateResult: TranslationResult | null = null;

  setHealthResult(result: boolean): void {
    this.healthResult = result;
  }

  setAvailableResult(result: boolean): void {
    this.availableResult = result;
  }

  setTranslateResult(result: TranslationResult): void {
    this.translateResult = result;
  }

  async checkServiceHealth(): Promise<boolean> {
    this.calls.push({ method: 'checkServiceHealth', args: [] });
    return this.healthResult;
  }

  async translate(
    text: string,
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<TranslationResult> {
    this.calls.push({
      method: 'translate',
      args: [text, sourceLanguage, targetLanguage],
    });
    return (
      this.translateResult ?? {
        original: text,
        translated: `[translated] ${text}`,
        sourceLanguage,
        targetLanguage,
      }
    );
  }

  isAvailable(): boolean {
    this.calls.push({ method: 'isAvailable', args: [] });
    return this.availableResult;
  }

  getLastCall(method: string) {
    return this.calls.filter((c) => c.method === method).pop();
  }
}

class StubTranslationBatchService implements Partial<TranslationBatchService> {
  calls: Array<{ method: string; args: unknown[] }> = [];
  private batchResult: BatchTranslationResult | null = null;

  setBatchResult(result: BatchTranslationResult): void {
    this.batchResult = result;
  }

  async translateBatch(
    texts: string[],
    sourceLanguage: TranslationLanguage,
    targetLanguage: TranslationLanguage,
  ): Promise<BatchTranslationResult> {
    this.calls.push({
      method: 'translateBatch',
      args: [texts, sourceLanguage, targetLanguage],
    });
    return (
      this.batchResult ?? {
        translations: texts.map((t) => ({
          original: t,
          translated: `[translated] \${t}`,
          sourceLanguage,
          targetLanguage,
        })),
        failed: [],
      }
    );
  }

  getLastCall(method: string) {
    return this.calls.filter((c) => c.method === method).pop();
  }
}

class StubResumeTranslationService implements Partial<ResumeTranslationService> {
  calls: Array<{ method: string; args: unknown[] }> = [];
  private englishResult: Record<string, unknown> | null = null;
  private portugueseResult: Record<string, unknown> | null = null;

  setEnglishResult(result: Record<string, unknown>): void {
    this.englishResult = result;
  }

  setPortugueseResult(result: Record<string, unknown>): void {
    this.portugueseResult = result;
  }

  async translateToEnglish(resumeData: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.calls.push({ method: 'translateToEnglish', args: [resumeData] });
    return this.englishResult ?? resumeData;
  }

  async translateToPortuguese(
    resumeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.calls.push({ method: 'translateToPortuguese', args: [resumeData] });
    return this.portugueseResult ?? resumeData;
  }

  getLastCall(method: string) {
    return this.calls.filter((c) => c.method === method).pop();
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('TranslationService', () => {
  let service: TranslationService;
  let coreService: StubTranslationCoreService;
  let batchService: StubTranslationBatchService;
  let resumeService: StubResumeTranslationService;

  beforeEach(() => {
    coreService = new StubTranslationCoreService();
    batchService = new StubTranslationBatchService();
    resumeService = new StubResumeTranslationService();

    service = new TranslationService(
      coreService as unknown as TranslationCoreService,
      batchService as unknown as TranslationBatchService,
      resumeService as unknown as ResumeTranslationService,
    );
  });

  describe('onModuleInit', () => {
    it('should check service health on initialization', async () => {
      coreService.setHealthResult(true);

      await service.onModuleInit();

      expect(coreService.getLastCall('checkServiceHealth')).toBeDefined();
    });
  });

  describe('checkServiceHealth', () => {
    it('should delegate health check to core service', async () => {
      coreService.setHealthResult(true);

      const result = await service.checkServiceHealth();

      expect(result).toBe(true);
      expect(coreService.getLastCall('checkServiceHealth')).toBeDefined();
    });

    it('should return false when service is unavailable', async () => {
      coreService.setHealthResult(false);

      const result = await service.checkServiceHealth();

      expect(result).toBe(false);
    });
  });

  describe('translatePtToEn', () => {
    it('should translate Portuguese text to English', async () => {
      const mockResult: TranslationResult = {
        original: 'Olá mundo',
        translated: 'Hello world',
        sourceLanguage: 'pt',
        targetLanguage: 'en',
      };
      coreService.setTranslateResult(mockResult);

      const result = await service.translatePtToEn('Olá mundo');

      expect(result).toEqual(mockResult);
      expect(coreService.getLastCall('translate')?.args).toEqual(['Olá mundo', 'pt', 'en']);
    });
  });

  describe('translateEnToPt', () => {
    it('should translate English text to Portuguese', async () => {
      const mockResult: TranslationResult = {
        original: 'Hello world',
        translated: 'Olá mundo',
        sourceLanguage: 'en',
        targetLanguage: 'pt',
      };
      coreService.setTranslateResult(mockResult);

      const result = await service.translateEnToPt('Hello world');

      expect(result).toEqual(mockResult);
      expect(coreService.getLastCall('translate')?.args).toEqual(['Hello world', 'en', 'pt']);
    });
  });

  describe('translate', () => {
    it('should translate text with Portuguese to English', async () => {
      const mockResult: TranslationResult = {
        original: 'Olá',
        translated: 'Hello',
        sourceLanguage: 'pt',
        targetLanguage: 'en',
      };
      coreService.setTranslateResult(mockResult);

      const result = await service.translate('Olá', 'pt', 'en');

      expect(result).toEqual(mockResult);
      expect(coreService.getLastCall('translate')?.args).toEqual(['Olá', 'pt', 'en']);
    });

    it('should handle English to Portuguese translation', async () => {
      const mockResult: TranslationResult = {
        original: 'Goodbye',
        translated: 'Adeus',
        sourceLanguage: 'en',
        targetLanguage: 'pt',
      };
      coreService.setTranslateResult(mockResult);

      const result = await service.translate('Goodbye', 'en', 'pt');

      expect(result).toEqual(mockResult);
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts at once', async () => {
      const mockResult: BatchTranslationResult = {
        translations: [
          {
            original: 'Hello',
            translated: 'Olá',
            sourceLanguage: 'en',
            targetLanguage: 'pt',
          },
          {
            original: 'World',
            translated: 'Mundo',
            sourceLanguage: 'en',
            targetLanguage: 'pt',
          },
        ],
        failed: [],
      };
      batchService.setBatchResult(mockResult);

      const result = await service.translateBatch(['Hello', 'World'], 'en', 'pt');

      expect(result).toEqual(mockResult);
      expect(batchService.getLastCall('translateBatch')?.args).toEqual([
        ['Hello', 'World'],
        'en',
        'pt',
      ]);
    });

    it('should handle empty batch gracefully', async () => {
      batchService.setBatchResult({ translations: [], failed: [] });

      const result = await service.translateBatch([], 'en', 'pt');

      expect(result.translations).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('translateResumeToEnglish', () => {
    it('should translate resume data to English', async () => {
      const resumeData = {
        title: 'Desenvolvedor Senior',
        summary: 'Experiência em TypeScript',
      };
      const translatedData = {
        title: 'Senior Developer',
        summary: 'Experience in TypeScript',
      };
      resumeService.setEnglishResult(translatedData);

      const result = await service.translateResumeToEnglish(resumeData);

      expect(result).toEqual(translatedData);
      expect(resumeService.getLastCall('translateToEnglish')?.args).toEqual([resumeData]);
    });

    it('should handle complex resume structure', async () => {
      const complexResume = {
        personalInfo: {
          name: 'João Silva',
          profession: 'Engenheiro de Software',
        },
        skills: ['TypeScript', 'Node.js'],
        experience: [{ company: 'Empresa A', role: 'Desenvolvedor' }],
      };
      const translatedResume = {
        personalInfo: {
          name: 'João Silva',
          profession: 'Software Engineer',
        },
        skills: ['TypeScript', 'Node.js'],
        experience: [{ company: 'Empresa A', role: 'Developer' }],
      };
      resumeService.setEnglishResult(translatedResume);

      const result = await service.translateResumeToEnglish(complexResume);

      expect(result).toEqual(translatedResume);
    });
  });

  describe('translateResumeToPortuguese', () => {
    it('should translate resume data to Portuguese', async () => {
      const resumeData = {
        title: 'Senior Developer',
        summary: 'Experience in TypeScript',
      };
      const translatedData = {
        title: 'Desenvolvedor Senior',
        summary: 'Experiência em TypeScript',
      };
      resumeService.setPortugueseResult(translatedData);

      const result = await service.translateResumeToPortuguese(resumeData);

      expect(result).toEqual(translatedData);
      expect(resumeService.getLastCall('translateToPortuguese')?.args).toEqual([resumeData]);
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is available', () => {
      coreService.setAvailableResult(true);

      const result = service.isAvailable();

      expect(result).toBe(true);
      expect(coreService.getLastCall('isAvailable')).toBeDefined();
    });

    it('should return false when service is unavailable', () => {
      coreService.setAvailableResult(false);

      const result = service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('service availability delegation', () => {
    it('should consistently reflect core service availability state', () => {
      coreService.setAvailableResult(true);
      expect(service.isAvailable()).toBe(true);

      coreService.setAvailableResult(false);
      expect(service.isAvailable()).toBe(false);

      coreService.setAvailableResult(true);
      expect(service.isAvailable()).toBe(true);
    });
  });
});
