/**
 * DocxBuilderService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockResume } from '@test/shared/factories/resume.factory';
import { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { UserDataPort } from '../../../domain/ports/user-data.port';
import { DocxBuilderService } from './docx-builder.service';
import { DocxSectionsService } from './docx-sections.service';
import { DocxStylesService } from './docx-styles.service';

describe('DocxBuilderService', () => {
  let service: DocxBuilderService;

  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockResume = {
    ...createMockResume({
      id: 'resume-1',
      userId: 'user-1',
      fullName: 'John Doe',
      jobTitle: 'Software Engineer',
    }),
    resumeSections: [],
  };

  const mockSection = {
    properties: {},
    children: [],
  };

  const stubResumesRepository = {
    findResumeByUserId: mock().mockResolvedValue(mockResume),
  };

  const stubUsersRepository = {
    findById: mock().mockResolvedValue(mockUser),
  };

  const stubSectionsService = {
    createMainSection: mock().mockReturnValue(mockSection),
  };

  const stubStylesService = {
    getDocumentStyles: mock().mockReturnValue({
      default: { heading1: {}, normal: {} },
    }),
  };

  const stubSectionTypeRepository = {
    findByKey: mock().mockReturnValue({
      definition: {
        ats: { recommendedPosition: 1 },
        export: { docx: {} },
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocxBuilderService,
        { provide: ResumesRepository, useValue: stubResumesRepository },
        { provide: UserDataPort, useValue: stubUsersRepository },
        { provide: DocxSectionsService, useValue: stubSectionsService },
        { provide: DocxStylesService, useValue: stubStylesService },
        { provide: SectionTypeRepository, useValue: stubSectionTypeRepository },
      ],
    }).compile();

    service = module.get<DocxBuilderService>(DocxBuilderService);
  });

  describe('generate', () => {
    it('should return DOCX buffer', async () => {
      const result = await service.generate('user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw EntityNotFoundException when user not found', async () => {
      stubUsersRepository.findById.mockResolvedValueOnce(null);

      await expect(async () => await service.generate('nonexistent')).toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw EntityNotFoundException when resume not found', async () => {
      stubResumesRepository.findResumeByUserId.mockResolvedValueOnce(null);

      await expect(async () => await service.generate('user-1')).toThrow(EntityNotFoundException);
    });

    it('should use sections service to create document structure', async () => {
      await service.generate('user-1');

      // Now uses generic sections instead of typed DocxResumeData
      expect(stubSectionsService.createMainSection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
        }),
        // Sections array is empty because mockResume.resumeSections is empty
        expect.arrayContaining([]),
      );
    });

    it('should apply document styles', async () => {
      await service.generate('user-1');

      expect(stubStylesService.getDocumentStyles).toHaveBeenCalled();
    });
  });
});
