/**
 * Resume PDF Service Unit Tests
 *
 * Pure tests using in-memory implementations.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import type { PdfGeneratorOptions } from '../../domain/ports/pdf-generator.port';
import { TypstPdfGeneratorService } from '../../infrastructure/adapters/external-services/typst-pdf-generator.service';
import { ResumePDFService } from './resume-pdf.service';

/**
 * In-Memory PDF Generator for testing
 */
class InMemoryPdfGenerator {
  private buffer = Buffer.from('pdf-content');
  private lastOptions: PdfGeneratorOptions | null = null;
  private shouldFail = false;
  private error: Error | null = null;

  async generate(options: PdfGeneratorOptions = {}): Promise<Buffer> {
    this.lastOptions = options;
    if (this.shouldFail && this.error) {
      throw this.error;
    }
    return this.buffer;
  }

  getLastOptions(): PdfGeneratorOptions | null {
    return this.lastOptions;
  }

  setFailure(error: Error): void {
    this.shouldFail = true;
    this.error = error;
  }

  reset(): void {
    this.lastOptions = null;
    this.shouldFail = false;
    this.error = null;
  }
}

describe('ResumePDFService', () => {
  let service: ResumePDFService;
  let generatorService: InMemoryPdfGenerator;

  beforeEach(async () => {
    generatorService = new InMemoryPdfGenerator();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumePDFService,
        {
          provide: TypstPdfGeneratorService,
          useValue: generatorService,
        },
      ],
    }).compile();

    service = module.get<ResumePDFService>(ResumePDFService);
  });

  describe('generate', () => {
    it('should generate PDF for valid resume with default options', async () => {
      const result = await service.generate();

      expect(result).toBeInstanceOf(Buffer);
      expect(generatorService.getLastOptions()).toEqual({});
    });

    it('should use custom palette parameter', async () => {
      await service.generate({ palette: 'ocean' });

      expect(generatorService.getLastOptions()).toEqual({ palette: 'ocean' });
    });

    it('should use custom language parameter', async () => {
      await service.generate({ lang: 'en' });

      expect(generatorService.getLastOptions()).toEqual({ lang: 'en' });
    });

    it('should include bannerColor when provided', async () => {
      await service.generate({ bannerColor: 'blue' });

      expect(generatorService.getLastOptions()).toEqual({
        bannerColor: 'blue',
      });
    });

    it('should include userId when provided', async () => {
      await service.generate({ userId: 'user-123' });

      expect(generatorService.getLastOptions()).toEqual({ userId: 'user-123' });
    });

    it('should pass through all options to generator', async () => {
      const options = {
        palette: 'midnight',
        lang: 'pt-br',
        bannerColor: 'purple',
        userId: 'abc-123',
      };

      await service.generate(options);

      expect(generatorService.getLastOptions()).toEqual(options);
    });

    it('should handle errors from generator', async () => {
      generatorService.setFailure(new Error('PDF generation failed'));

      await expect(async () => await service.generate()).toThrow('PDF generation failed');
    });
  });
});
