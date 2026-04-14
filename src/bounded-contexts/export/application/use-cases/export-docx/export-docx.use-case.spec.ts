import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import type { DocxBuilderPort } from '../../../domain/ports/docx-builder.port';
import { ExportDocxUseCase } from './export-docx.use-case';

describe('ExportDocxUseCase', () => {
  let useCase: ExportDocxUseCase;

  const mockDocxBuilder: DocxBuilderPort = {
    generate: mock(),
  };

  beforeEach(() => {
    useCase = new ExportDocxUseCase(mockDocxBuilder);
  });

  afterEach(() => {});

  describe('execute', () => {
    it('should generate DOCX for complete resume', async () => {
      const mockBuffer = Buffer.from('mock-docx-content');
      (mockDocxBuilder.generate as ReturnType<typeof mock>).mockResolvedValue(mockBuffer);

      const result = await useCase.execute({ userId: 'user-123' });

      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(mockBuffer);
      expect(mockDocxBuilder.generate).toHaveBeenCalledWith('user-123');
    });

    it('should throw EntityNotFoundException when user not found', async () => {
      (mockDocxBuilder.generate as ReturnType<typeof mock>).mockRejectedValue(
        new EntityNotFoundException('User'),
      );

      await expect(async () => await useCase.execute({ userId: 'non-existent-user' })).toThrow(
        EntityNotFoundException,
      );
      await expect(async () => await useCase.execute({ userId: 'non-existent-user' })).toThrow(
        'User not found',
      );
    });

    it('should throw EntityNotFoundException when resume not found', async () => {
      (mockDocxBuilder.generate as ReturnType<typeof mock>).mockRejectedValue(
        new EntityNotFoundException('Resume'),
      );

      await expect(async () => await useCase.execute({ userId: 'user-123' })).toThrow(
        EntityNotFoundException,
      );
      await expect(async () => await useCase.execute({ userId: 'user-123' })).toThrow(
        'Resume not found',
      );
    });

    it('should handle errors from builder service', async () => {
      const error = new Error('Builder service error');
      (mockDocxBuilder.generate as ReturnType<typeof mock>).mockRejectedValue(error);

      await expect(async () => await useCase.execute({ userId: 'user-123' })).toThrow(
        'Builder service error',
      );
    });
  });
});
