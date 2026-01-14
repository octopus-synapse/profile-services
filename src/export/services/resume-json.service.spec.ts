import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ResumeJsonService } from './resume-json.service';

describe('ResumeJsonService', () => {
  let service: ResumeJsonService;
  let mockPrismaService: {
    resume: { findUnique: ReturnType<typeof mock> };
  };

  const mockResume = {
    id: 'resume-123',
    userId: 'user-456',
    titleEn: 'Software Engineer',
    titlePtBr: 'Engenheiro de Software',
    slug: 'john-doe',
    isPublic: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    user: {
      id: 'user-456',
      name: 'John Doe',
      email: 'john@example.com',
    },
    experiences: [
      {
        id: 'exp-1',
        titleEn: 'Senior Developer',
        companyEn: 'Tech Corp',
        startDate: new Date('2020-01-01'),
        endDate: null,
        isPresent: true,
        descriptionEn: 'Building awesome stuff',
      },
    ],
    education: [
      {
        id: 'edu-1',
        degreeEn: 'Computer Science',
        institutionEn: 'MIT',
        startDate: new Date('2015-01-01'),
        endDate: new Date('2019-01-01'),
      },
    ],
    skills: [
      { id: 'skill-1', nameEn: 'TypeScript', level: 'EXPERT' },
      { id: 'skill-2', nameEn: 'Node.js', level: 'ADVANCED' },
    ],
  };

  beforeEach(() => {
    mockPrismaService = {
      resume: {
        findUnique: mock(() => Promise.resolve(mockResume)),
      },
    };

    service = new ResumeJsonService(mockPrismaService as any);
  });

  describe('exportAsJson', () => {
    it('should export resume as JSON Resume format', async () => {
      const result = await service.exportAsJson('resume-123');

      expect(result).toBeDefined();
      expect(result.$schema).toBe(
        'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      );
    });

    it('should include basics section with personal info', async () => {
      const result = await service.exportAsJson('resume-123');

      expect(result.basics).toBeDefined();
      expect(result.basics.name).toBe('John Doe');
      expect(result.basics.label).toBe('Software Engineer');
    });

    it('should include work experience', async () => {
      const result = await service.exportAsJson('resume-123');

      expect(result.work).toHaveLength(1);
      expect(result.work[0].position).toBe('Senior Developer');
      expect(result.work[0].company).toBe('Tech Corp');
    });

    it('should include education', async () => {
      const result = await service.exportAsJson('resume-123');

      expect(result.education).toHaveLength(1);
      expect(result.education[0].studyType).toBe('Computer Science');
      expect(result.education[0].institution).toBe('MIT');
    });

    it('should include skills', async () => {
      const result = await service.exportAsJson('resume-123');

      expect(result.skills).toHaveLength(2);
      expect(result.skills[0].name).toBe('TypeScript');
      expect(result.skills[0].level).toBe('Expert');
    });

    it('should throw NotFoundException when resume not found', async () => {
      mockPrismaService.resume.findUnique = mock(() => Promise.resolve(null));

      await expect(service.exportAsJson('non-existent')).rejects.toThrow(
        'Resume not found',
      );
    });
  });

  describe('exportAsBuffer', () => {
    it('should return JSON as Buffer', async () => {
      const buffer = await service.exportAsBuffer('resume-123');

      expect(buffer).toBeInstanceOf(Buffer);
      const parsed = JSON.parse(buffer.toString());
      expect(parsed.$schema).toBeDefined();
    });
  });

  describe('Custom ProFile format', () => {
    it('should export in ProFile custom format when specified', async () => {
      const result = await service.exportAsJson('resume-123', {
        format: 'profile',
      });

      expect(result.format).toBe('profile');
      expect(result.version).toBe('1.0');
      expect(result.resume).toBeDefined();
    });
  });
});
