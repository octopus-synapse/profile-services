/**
 * DocxBuilderService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '../../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ResumeNotFoundError,
  UserNotFoundError,
} from '@octopus-synapse/profile-contracts';
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

  const mockResume = createMockResume({
    id: 'resume-1',
    userId: 'user-1',
    fullName: 'John Doe',
    jobTitle: 'Software Engineer',
    experiences: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
  });

  const mockSection = {
    properties: {},
    children: [],
  };

  const stubResumesRepository = {
    findResumeByUserId: mock().mockResolvedValue(mockResume),
  };

  const stubUsersRepository = {
    findUserById: mock().mockResolvedValue(mockUser),
  };

  const stubSectionsService = {
    createMainSection: mock().mockReturnValue(mockSection),
  };

  const stubStylesService = {
    getDocumentStyles: mock().mockReturnValue({
      default: { heading1: {}, normal: {} },
    }),
  };

  beforeEach(async () => {
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

    it('should throw UserNotFoundError when user not found', async () => {
      stubUsersRepository.findUserById.mockResolvedValueOnce(null);

      await expect(service.generate('nonexistent')).rejects.toThrow(
        UserNotFoundError,
      );
    });

    it('should throw ResumeNotFoundError when resume not found', async () => {
      stubResumesRepository.findResumeByUserId.mockResolvedValueOnce(null);

      await expect(service.generate('user-1')).rejects.toThrow(
        ResumeNotFoundError,
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
