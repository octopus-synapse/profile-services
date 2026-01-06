import { Test, TestingModule } from '@nestjs/testing';
import { TranslationService } from './translation.service';
import { TranslationCoreService } from './services/translation-core.service';
import { TranslationBatchService } from './services/translation-batch.service';
import { ResumeTranslationService } from './services/resume-translation.service';
import { TranslationResult, BatchTranslationResult } from './types/translation.types';

describe('TranslationService', () => {
  let service: TranslationService;
  let mockCoreService: jest.Mocked<TranslationCoreService>;
  let mockBatchService: jest.Mocked<TranslationBatchService>;
  let mockResumeService: jest.Mocked<ResumeTranslationService>;

  beforeEach(async () => {
    mockCoreService = {
      checkServiceHealth: jest.fn(),
      translate: jest.fn(),
      isAvailable: jest.fn(),
    } as any;

    mockBatchService = {
      translateBatch: jest.fn(),
    } as any;

    mockResumeService = {
      translateToEnglish: jest.fn(),
      translateToPortuguese: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: TranslationCoreService, useValue: mockCoreService },
        { provide: TranslationBatchService, useValue: mockBatchService },
        { provide: ResumeTranslationService, useValue: mockResumeService },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
  });

  describe('onModuleInit', () => {
    it('should check service health on initialization', async () => {
      mockCoreService.checkServiceHealth.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockCoreService.checkServiceHealth).toHaveBeenCalled();
    });
  });

  describe('checkServiceHealth', () => {
    it('should delegate health check to core service', async () => {
      mockCoreService.checkServiceHealth.mockResolvedValue(true);

      const result = await service.checkServiceHealth();

      expect(result).toBe(true);
      expect(mockCoreService.checkServiceHealth).toHaveBeenCalled();
    });

    it('should return false when service is unavailable', async () => {
      mockCoreService.checkServiceHealth.mockResolvedValue(false);

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
      mockCoreService.translate.mockResolvedValue(mockResult);

      const result = await service.translatePtToEn('Olá mundo');

      expect(result).toEqual(mockResult);
      expect(mockCoreService.translate).toHaveBeenCalledWith('Olá mundo', 'pt', 'en');
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
      mockCoreService.translate.mockResolvedValue(mockResult);

      const result = await service.translateEnToPt('Hello world');

      expect(result).toEqual(mockResult);
      expect(mockCoreService.translate).toHaveBeenCalledWith('Hello world', 'en', 'pt');
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
      mockCoreService.translate.mockResolvedValue(mockResult);

      const result = await service.translate('Olá', 'pt', 'en');

      expect(result).toEqual(mockResult);
      expect(mockCoreService.translate).toHaveBeenCalledWith('Olá', 'pt', 'en');
    });

    it('should handle English to Portuguese translation', async () => {
      const mockResult: TranslationResult = {
        original: 'Goodbye',
        translated: 'Adeus',
        sourceLanguage: 'en',
        targetLanguage: 'pt',
      };
      mockCoreService.translate.mockResolvedValue(mockResult);

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
      mockBatchService.translateBatch.mockResolvedValue(mockResult);

      const result = await service.translateBatch(['Hello', 'World'], 'en', 'pt');

      expect(result).toEqual(mockResult);
      expect(mockBatchService.translateBatch).toHaveBeenCalledWith(
        ['Hello', 'World'],
        'en',
        'pt',
      );
    });

    it('should handle empty batch gracefully', async () => {
      const mockResult: BatchTranslationResult = {
        translations: [],
        failed: [],
      };
      mockBatchService.translateBatch.mockResolvedValue(mockResult);

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
      mockResumeService.translateToEnglish.mockResolvedValue(translatedData);

      const result = await service.translateResumeToEnglish(resumeData);

      expect(result).toEqual(translatedData);
      expect(mockResumeService.translateToEnglish).toHaveBeenCalledWith(resumeData);
    });

    it('should handle complex resume structure', async () => {
      const complexResume = {
        personalInfo: {
          name: 'João Silva',
          profession: 'Engenheiro de Software',
        },
        skills: ['TypeScript', 'Node.js'],
        experience: [
          { company: 'Empresa A', role: 'Desenvolvedor' },
        ],
      };
      const translatedResume = {
        personalInfo: {
          name: 'João Silva',
          profession: 'Software Engineer',
        },
        skills: ['TypeScript', 'Node.js'],
        experience: [
          { company: 'Empresa A', role: 'Developer' },
        ],
      };
      mockResumeService.translateToEnglish.mockResolvedValue(translatedResume);

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
      mockResumeService.translateToPortuguese.mockResolvedValue(translatedData);

      const result = await service.translateResumeToPortuguese(resumeData);

      expect(result).toEqual(translatedData);
      expect(mockResumeService.translateToPortuguese).toHaveBeenCalledWith(resumeData);
    });
  });

  describe('isAvailable', () => {
    it('should return true when service is available', () => {
      mockCoreService.isAvailable.mockReturnValue(true);

      const result = service.isAvailable();

      expect(result).toBe(true);
      expect(mockCoreService.isAvailable).toHaveBeenCalled();
    });

    it('should return false when service is unavailable', () => {
      mockCoreService.isAvailable.mockReturnValue(false);

      const result = service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('service availability delegation', () => {
    it('should consistently reflect core service availability state', () => {
      mockCoreService.isAvailable.mockReturnValue(true);
      expect(service.isAvailable()).toBe(true);

      mockCoreService.isAvailable.mockReturnValue(false);
      expect(service.isAvailable()).toBe(false);

      mockCoreService.isAvailable.mockReturnValue(true);
      expect(service.isAvailable()).toBe(true);
    });
  });
});
