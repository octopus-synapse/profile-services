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
    title: 'My Resume',
    jobTitle: 'Software Engineer',
    slug: 'john-doe',
    summary: 'Experienced developer',
    isPublic: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    user: {
      id: 'user-456',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
    experiences: [
      {
        id: 'exp-1',
        position: 'Senior Developer',
        company: 'Tech Corp',
        startDate: new Date('2020-01-01'),
        endDate: null,
        isCurrent: true,
        description: 'Building awesome stuff',
        skills: ['TypeScript', 'React'],
      },
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'Computer Science',
        institution: 'MIT',
        fieldOfStudy: 'Software Engineering',
        startDate: new Date('2015-01-01'),
        endDate: new Date('2019-01-01'),
      },
    ],
    skills: [
      { id: 'skill-1', name: 'TypeScript', level: 4 },
      { id: 'skill-2', name: 'Node.js', level: 3 },
    ],
    languages: [
      { id: 'lang-1', name: 'English', level: 'FLUENT' },
      { id: 'lang-2', name: 'Portuguese', level: 'NATIVE' },
    ],
    openSource: [
      {
        id: 'os-1',
        projectName: 'Cool Project',
        description: 'Open source contribution',
        repoUrl: 'https://github.com/example/project',
      },
    ],
    certifications: [],
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
      const result = (await service.exportAsJson('resume-123')) as any;

      expect(result.basics).toBeDefined();
      expect(result.basics.name).toBe('John Doe');
      expect(result.basics.email).toBe('john@example.com');
    });

    it('should include work experience', async () => {
      const result = (await service.exportAsJson('resume-123')) as any;

      expect(result.work).toBeDefined();
      expect(result.work).toHaveLength(1);
      expect(result.work[0].company).toBe('Tech Corp');
      expect(result.work[0].position).toBe('Senior Developer');
    });

    it('should include education', async () => {
      const result = (await service.exportAsJson('resume-123')) as any;

      expect(result.education).toBeDefined();
      expect(result.education).toHaveLength(1);
      expect(result.education[0].institution).toBe('MIT');
    });

    it('should include skills', async () => {
      const result = (await service.exportAsJson('resume-123')) as any;

      expect(result.skills).toBeDefined();
      expect(result.skills).toHaveLength(2);
      expect(result.skills[0].name).toBe('TypeScript');
    });

    it('should throw NotFoundException when resume not found', async () => {
      mockPrismaService.resume.findUnique = mock(() => Promise.resolve(null));

      await expect(service.exportAsJson('unknown')).rejects.toThrow(
        'Resume not found',
      );
    });
  });

  describe('exportAsBuffer', () => {
    it('should return JSON as Buffer', async () => {
      const result = await service.exportAsBuffer('resume-123');

      expect(result).toBeInstanceOf(Buffer);
      const parsed = JSON.parse(result.toString());
      expect(parsed.$schema).toBeDefined();
    });
  });

  describe('Custom ProFile format', () => {
    it('should export in ProFile custom format when specified', async () => {
      const result = await service.exportAsJson('resume-123', {
        format: 'profile',
      });

      expect(result).toHaveProperty('format', 'profile');
      expect(result).toHaveProperty('version', '1.0');
    });
  });
});
