import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '@test/factories/resume.factory';
import { ResumeJsonService } from './resume-json.service';

describe('ResumeJsonService', () => {
  let service: ResumeJsonService;
  let mockPrismaService: {
    resume: { findUnique: ReturnType<typeof mock> };
  };

  const mockResume = {
    ...createMockResume({
      id: 'user-456',
      userId: 'user-456',
      title: 'My Resume',
      jobTitle: 'Software Engineer',
      slug: 'john-doe',
      summary: 'Experienced developer',
      isPublic: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-06-01'),
    }),
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
    resumeSections: [
      {
        sectionType: { semanticKind: 'WORK_EXPERIENCE' },
        items: [
          {
            content: {
              position: 'Senior Developer',
              company: 'Tech Corp',
              startDate: new Date('2020-01-01'),
              endDate: null,
              isCurrent: true,
              description: 'Building awesome stuff',
              skills: ['TypeScript', 'React'],
            },
          },
        ],
      },
      {
        sectionType: { semanticKind: 'EDUCATION' },
        items: [
          {
            content: {
              degree: 'Computer Science',
              institution: 'MIT',
              fieldOfStudy: 'Software Engineering',
              startDate: new Date('2015-01-01'),
              endDate: new Date('2019-01-01'),
            },
          },
        ],
      },
      {
        sectionType: { semanticKind: 'SKILL_SET' },
        items: [
          { content: { name: 'TypeScript', level: 4 } },
          { content: { name: 'Node.js', level: 3 } },
        ],
      },
      {
        sectionType: { semanticKind: 'LANGUAGE' },
        items: [
          { content: { name: 'English', level: 'FLUENT' } },
          { content: { name: 'Portuguese', level: 'NATIVE' } },
        ],
      },
      {
        sectionType: { semanticKind: 'OPEN_SOURCE' },
        items: [
          {
            content: {
              projectName: 'Cool Project',
              description: 'Open source contribution',
              projectUrl: 'https://github.com/example/project',
            },
          },
        ],
      },
    ],
  } as any;

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

    it('should include generic sections', async () => {
      const result = (await service.exportAsJson('resume-123')) as any;

      expect(result.sections).toBeDefined();
      expect(result.sections).toHaveLength(5);
      expect(result.sections[0].semanticKind).toBe('WORK_EXPERIENCE');
      expect(result.sections[0].items).toHaveLength(1);
    });

    it('should preserve section item content', async () => {
      const result = (await service.exportAsJson('resume-123')) as any;

      const workSection = result.sections.find(
        (section: { semanticKind: string }) =>
          section.semanticKind === 'WORK_EXPERIENCE',
      );

      expect(workSection).toBeDefined();
      expect(workSection.items[0].position).toBe('Senior Developer');
      expect(workSection.items[0].company).toBe('Tech Corp');
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
      expect((result as any).resume.sections).toBeDefined();
      expect((result as any).resume.sections).toHaveLength(5);
    });
  });
});
