/**
 * Export PDF Use Case Unit Tests
 *
 * Pure tests using in-memory implementations.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { PdfGeneratorOptions, PdfGeneratorPort } from '../../../domain/ports/pdf-generator.port';

/**
 * In-Memory PDF Generator for testing
 */
class InMemoryPdfGenerator implements PdfGeneratorPort {
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

import { ExportPdfUseCase } from './export-pdf.use-case';

describe('ExportPdfUseCase', () => {
  let useCase: ExportPdfUseCase;
  let pdfGenerator: InMemoryPdfGenerator;

  beforeEach(() => {
    pdfGenerator = new InMemoryPdfGenerator();
    useCase = new ExportPdfUseCase(pdfGenerator);
  });

  describe('execute', () => {
    it('should generate PDF for valid resume with default options', async () => {
      const result = await useCase.execute();

      expect(result).toBeInstanceOf(Buffer);
      expect(pdfGenerator.getLastOptions()).toEqual({
        palette: undefined,
        lang: undefined,
        bannerColor: undefined,
        userId: undefined,
      });
    });

    it('should use custom palette parameter', async () => {
      await useCase.execute({ palette: 'ocean' });

      expect(pdfGenerator.getLastOptions()).toEqual({
        palette: 'ocean',
        lang: undefined,
        bannerColor: undefined,
        userId: undefined,
      });
    });

    it('should use custom language parameter', async () => {
      await useCase.execute({ lang: 'en' });

      expect(pdfGenerator.getLastOptions()).toEqual({
        palette: undefined,
        lang: 'en',
        bannerColor: undefined,
        userId: undefined,
      });
    });

    it('should include bannerColor when provided', async () => {
      await useCase.execute({ bannerColor: 'blue' });

      expect(pdfGenerator.getLastOptions()).toEqual({
        palette: undefined,
        lang: undefined,
        bannerColor: 'blue',
        userId: undefined,
      });
    });

    it('should include userId when provided', async () => {
      await useCase.execute({ userId: 'user-123' });

      expect(pdfGenerator.getLastOptions()).toEqual({
        palette: undefined,
        lang: undefined,
        bannerColor: undefined,
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

      await useCase.execute(options);

      expect(pdfGenerator.getLastOptions()).toEqual(options);
    });

    it('should handle errors from generator', async () => {
      pdfGenerator.setFailure(new Error('PDF generation failed'));

      await expect(async () => await useCase.execute()).toThrow('PDF generation failed');
    });
  });
});
