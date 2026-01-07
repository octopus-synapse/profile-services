import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumePDFService } from './resume-pdf.service';
import { PdfGeneratorService } from './pdf-generator.service';

describe('ResumePDFService', () => {
  let service: ResumePDFService;
  let generatorService: PdfGeneratorService;

  beforeEach(async () => {
    const mockGeneratorService = {
      generate: mock().mockResolvedValue(Buffer.from('pdf-content')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumePDFService,
        {
          provide: PdfGeneratorService,
          useValue: mockGeneratorService,
        },
      ],
    }).compile();

    service = module.get<ResumePDFService>(ResumePDFService);
    generatorService = module.get(PdfGeneratorService);
  });

  afterEach(() => {});

  describe('generate', () => {
    it('should generate PDF for valid resume with default options', async () => {
      const result = await service.generate();

      expect(result).toBeInstanceOf(Buffer);
      expect(generatorService.generate).toHaveBeenCalledWith({});
    });

    it('should use custom palette parameter', async () => {
      await service.generate({ palette: 'ocean' });

      expect(generatorService.generate).toHaveBeenCalledWith({
        palette: 'ocean',
      });
    });

    it('should use custom language parameter', async () => {
      await service.generate({ lang: 'en' });

      expect(generatorService.generate).toHaveBeenCalledWith({ lang: 'en' });
    });

    it('should include bannerColor when provided', async () => {
      await service.generate({ bannerColor: 'blue' });

      expect(generatorService.generate).toHaveBeenCalledWith({
        bannerColor: 'blue',
      });
    });

    it('should include userId when provided', async () => {
      await service.generate({ userId: 'user-123' });

      expect(generatorService.generate).toHaveBeenCalledWith({
        userId: 'user-123',
      });
    });

    it('should pass through all options to generator', async () => {
      const options = {
        palette: 'midnight',
        lang: 'pt-br',
        bannerColor: 'purple',
        userId: 'abc-123',
      };

      await service.generate(options);

      expect(generatorService.generate).toHaveBeenCalledWith(options);
    });

    it('should handle errors from generator', async () => {
      const error = new Error('PDF generation failed');
      generatorService.generate.mockRejectedValueOnce(error);

      await expect(service.generate()).rejects.toThrow('PDF generation failed');
    });
  });
});
