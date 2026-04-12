import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import { GenericResumeSectionsService } from '@/bounded-contexts/resumes/core/services/generic-resume-sections.service';
import type { ResumeModel } from '../models/resume.model';
import { ResumeTemplate } from '../models/resume.model';
import { ResumeResolver } from '../resolvers/resume.resolver';

/**
 * Resume Resolver Tests
 *
 * Tests GraphQL resolver functionality with generic sections API:
 * - Query resolution (resume, myResumes, sectionTypes)
 * - Field resolution (sections)
 * - Mutations (createSectionItem, updateSectionItem, deleteSectionItem)
 */
describe('ResumeResolver', () => {
  let resolver: ResumeResolver;
  let resumesRepository: {
    findResumeByIdAndUserId: ReturnType<typeof mock>;
    findAllUserResumes: ReturnType<typeof mock>;
  };
  let sectionsService: {
    createItem: ReturnType<typeof mock>;
    updateItem: ReturnType<typeof mock>;
    deleteItem: ReturnType<typeof mock>;
    listResumeSections: ReturnType<typeof mock>;
    listSectionTypes: ReturnType<typeof mock>;
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
  } as unknown as User;

  const mockResume: ResumeModel = {
    id: 'resume-123',
    userId: 'user-123',
    title: 'Software Engineer Resume',
    isPublic: false,
    template: ResumeTemplate.MODERN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeResolver,
        {
          provide: ResumesRepository,
          useValue: {
            findResumeByIdAndUserId: mock(() => Promise.resolve(null)),
            findAllUserResumes: mock(() => Promise.resolve([])),
          },
        },
        {
          provide: GenericResumeSectionsService,
          useValue: {
            createItem: mock(() => Promise.resolve(null)),
            updateItem: mock(() => Promise.resolve(null)),
            deleteItem: mock(() => Promise.resolve(undefined)),
            listResumeSections: mock(() => Promise.resolve([])),
            listSectionTypes: mock(() => Promise.resolve([])),
          },
        },
      ],
    }).compile();

    resolver = module.get<ResumeResolver>(ResumeResolver);
    resumesRepository = module.get(ResumesRepository);
    sectionsService = module.get(GenericResumeSectionsService);
  });

  // ============================================================
  // Queries
  // ============================================================

  describe('getResume', () => {
    it('should return a resume by ID', async () => {
      resumesRepository.findResumeByIdAndUserId.mockImplementation(() =>
        Promise.resolve(mockResume),
      );

      const result = await resolver.getResume('resume-123', mockUser);

      expect(result).toEqual(mockResume);
      expect(resumesRepository.findResumeByIdAndUserId.mock.calls.length).toBe(1);
    });
  });

  describe('getMyResumes', () => {
    it('should return all resumes for current user', async () => {
      const resumes = [mockResume];
      resumesRepository.findAllUserResumes.mockImplementation(() => Promise.resolve(resumes));

      const result = await resolver.getMyResumes(mockUser);

      expect(result).toEqual(resumes);
      expect(resumesRepository.findAllUserResumes.mock.calls.length).toBe(1);
    });
  });

  describe('sectionTypes', () => {
    it('should return available section types', async () => {
      const mockSectionTypes = [
        {
          key: 'work_experience_v1',
          semanticKind: 'WORK_EXPERIENCE',
          displayName: 'Work Experience',
        },
        {
          key: 'education_v1',
          semanticKind: 'EDUCATION',
          displayName: 'Education',
        },
        {
          key: 'skill_set_v1',
          semanticKind: 'SKILL_SET',
          displayName: 'Skills',
        },
      ];

      sectionsService.listSectionTypes.mockImplementation(() => Promise.resolve(mockSectionTypes));

      const result = await resolver.sectionTypes(mockUser);

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('work_experience_v1');
      expect(result[0].semanticKind).toBe('WORK_EXPERIENCE');
    });
  });

  // ============================================================
  // Field Resolvers
  // ============================================================

  describe('sections', () => {
    it('should return sections with items for a resume', async () => {
      const mockSections = [
        {
          id: 'section-1',
          sectionType: {
            key: 'work_experience_v1',
            semanticKind: 'WORK_EXPERIENCE',
            displayName: 'Work Experience',
          },
          title: 'Work Experience',
          order: 1,
          visible: true,
          items: [
            {
              id: 'item-1',
              order: 0,
              content: { company: 'Google', role: 'Engineer' },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'section-2',
          sectionType: {
            key: 'education_v1',
            semanticKind: 'EDUCATION',
            displayName: 'Education',
          },
          title: 'Education',
          order: 2,
          visible: true,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      sectionsService.listResumeSections.mockImplementation(() => Promise.resolve(mockSections));

      const result = await resolver.sections(mockResume);

      expect(result).toHaveLength(2);
      expect(result[0].sectionTypeKey).toBe('work_experience_v1');
      expect(result[0].semanticKind).toBe('WORK_EXPERIENCE');
      expect(result[0].items).toHaveLength(1);
      expect(result[0].items[0].content).toEqual({
        company: 'Google',
        role: 'Engineer',
      });
      expect(result[1].sectionTypeKey).toBe('education_v1');
      expect(result[1].items).toHaveLength(0);
    });

    it('should handle sections without sectionType', async () => {
      const mockSections = [
        {
          id: 'section-1',
          sectionType: null,
          title: 'Custom Section',
          order: 1,
          visible: true,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      sectionsService.listResumeSections.mockImplementation(() => Promise.resolve(mockSections));

      const result = await resolver.sections(mockResume);

      expect(result).toHaveLength(1);
      expect(result[0].sectionTypeKey).toBe('unknown');
      expect(result[0].semanticKind).toBe('CUSTOM');
    });
  });

  // ============================================================
  // Mutations - Generic Sections API
  // ============================================================

  describe('createSectionItem', () => {
    it('should create a section item with any section type and JSON content', async () => {
      const mockSectionItem = {
        id: 'item-456',
        order: 0,
        content: { name: 'TypeScript', level: 90 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sectionsService.createItem.mockImplementation(() => Promise.resolve(mockSectionItem));

      const result = await resolver.createSectionItem(
        'resume-123',
        'skill_set_v1',
        { name: 'TypeScript', level: 90 },
        mockUser,
      );

      expect(result.id).toBe('item-456');
      expect(result.sectionTypeKey).toBe('skill_set_v1');
      expect(result.content).toEqual({ name: 'TypeScript', level: 90 });
      expect(sectionsService.createItem.mock.calls.length).toBe(1);
      expect(sectionsService.createItem.mock.calls[0]).toEqual([
        'resume-123',
        'skill_set_v1',
        'user-123',
        { name: 'TypeScript', level: 90 },
      ]);
    });

    it('should create work experience item', async () => {
      const mockItem = {
        id: 'exp-1',
        order: 0,
        content: {
          company: 'Google',
          role: 'Software Engineer',
          startDate: '2020-01-01',
          current: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sectionsService.createItem.mockImplementation(() => Promise.resolve(mockItem));

      const result = await resolver.createSectionItem(
        'resume-123',
        'work_experience_v1',
        {
          company: 'Google',
          role: 'Software Engineer',
          startDate: '2020-01-01',
          current: true,
        },
        mockUser,
      );

      expect(result.id).toBe('exp-1');
      expect(result.sectionTypeKey).toBe('work_experience_v1');
      expect(result.content.company).toBe('Google');
    });

    it('should create education item', async () => {
      const mockItem = {
        id: 'edu-1',
        order: 0,
        content: {
          institution: 'MIT',
          degree: 'BS Computer Science',
          startDate: '2016-09-01',
          endDate: '2020-05-01',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sectionsService.createItem.mockImplementation(() => Promise.resolve(mockItem));

      const result = await resolver.createSectionItem(
        'resume-123',
        'education_v1',
        {
          institution: 'MIT',
          degree: 'BS Computer Science',
          startDate: '2016-09-01',
          endDate: '2020-05-01',
        },
        mockUser,
      );

      expect(result.id).toBe('edu-1');
      expect(result.sectionTypeKey).toBe('education_v1');
      expect(result.content.institution).toBe('MIT');
    });
  });

  describe('updateSectionItem', () => {
    it('should update a section item with partial JSON content', async () => {
      const mockUpdatedItem = {
        id: 'item-456',
        order: 0,
        content: { name: 'TypeScript', level: 95 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      sectionsService.updateItem.mockImplementation(() => Promise.resolve(mockUpdatedItem));

      const result = await resolver.updateSectionItem(
        'resume-123',
        'skill_set_v1',
        'item-456',
        { level: 95 },
        mockUser,
      );

      expect(result.id).toBe('item-456');
      expect(result.content).toEqual({ name: 'TypeScript', level: 95 });
      expect(sectionsService.updateItem.mock.calls.length).toBe(1);
    });
  });

  describe('deleteSectionItem', () => {
    it('should delete a section item and return true', async () => {
      sectionsService.deleteItem.mockImplementation(() => Promise.resolve(undefined));

      const result = await resolver.deleteSectionItem(
        'resume-123',
        'skill_set_v1',
        'item-456',
        mockUser,
      );

      expect(result).toBe(true);
      expect(sectionsService.deleteItem.mock.calls.length).toBe(1);
      expect(sectionsService.deleteItem.mock.calls[0]).toEqual([
        'resume-123',
        'skill_set_v1',
        'item-456',
        'user-123',
      ]);
    });
  });
});
