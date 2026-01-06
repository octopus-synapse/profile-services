/**
 * DocxBuilderService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocxBuilderService } from './docx-builder.service';
import { ResumesRepository } from '../../resumes/resumes.repository';
import { UsersRepository } from '../../users/users.repository';
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
    id: 'resume-1',
    userId: 'user-1',
    fullName: 'John Doe',
    jobTitle: 'Software Engineer',
    experiences: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
  };

  const mockSection = {
    properties: {},
    children: [],
  };

  const stubResumesRepository = {
    findByUserId: jest.fn().mockResolvedValue(mockResume),
  };

  const stubUsersRepository = {
    getUser: jest.fn().mockResolvedValue(mockUser),
  };

  const stubSectionsService = {
    createMainSection: jest.fn().mockReturnValue(mockSection),
  };

  const stubStylesService = {
    getDocumentStyles: jest.fn().mockReturnValue({
      default: { heading1: {}, normal: {} },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocxBuilderService,
        { provide: ResumesRepository, useValue: stubResumesRepository },
        { provide: UsersRepository, useValue: stubUsersRepository },
        { provide: DocxSectionsService, useValue: stubSectionsService },
        { provide: DocxStylesService, useValue: stubStylesService },
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

    it('should throw NotFoundException when user not found', async () => {
      stubUsersRepository.getUser.mockResolvedValueOnce(null);

      await expect(service.generate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when resume not found', async () => {
      stubResumesRepository.findByUserId.mockResolvedValueOnce(null);

      await expect(service.generate('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use sections service to create document structure', async () => {
      await service.generate('user-1');

      expect(stubSectionsService.createMainSection).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          id: 'resume-1',
          fullName: 'John Doe',
        }),
      );
    });

    it('should apply document styles', async () => {
      await service.generate('user-1');

      expect(stubStylesService.getDocumentStyles).toHaveBeenCalled();
    });
  });
});
