import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ResumeDOCXService } from './resume-docx.service';
import { DocxBuilderService } from './docx-builder.service';

describe('ResumeDOCXService', () => {
  let service: ResumeDOCXService;
  let builderService: jest.Mocked<DocxBuilderService>;

  const mockBuilderService = {
    generate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeDOCXService,
        {
          provide: DocxBuilderService,
          useValue: mockBuilderService,
        },
      ],
    }).compile();

    service = module.get<ResumeDOCXService>(ResumeDOCXService);
    builderService = module.get(DocxBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate DOCX for complete resume', async () => {
      const mockBuffer = Buffer.from('mock-docx-content');
      mockBuilderService.generate.mockResolvedValue(mockBuffer);

      const result = await service.generate('user-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(mockBuffer);
      expect(builderService.generate).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockBuilderService.generate.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.generate('non-existent-user')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generate('non-existent-user')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw NotFoundException when resume not found', async () => {
      mockBuilderService.generate.mockRejectedValue(
        new NotFoundException('Resume not found for this user'),
      );

      await expect(service.generate('user-123')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generate('user-123')).rejects.toThrow(
        'Resume not found for this user',
      );
    });

    it('should handle errors from builder service', async () => {
      const error = new Error('Builder service error');
      mockBuilderService.generate.mockRejectedValue(error);

      await expect(service.generate('user-123')).rejects.toThrow(
        'Builder service error',
      );
    });
  });
});
