import { beforeEach, describe, expect, it } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { createMockResume } from '@test/shared/factories/resume.factory';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { InMemoryResumeRepository } from '../testing';
import { ResumeLatexService } from './resume-latex.service';

describe('ResumeLatexService', () => {
  let service: ResumeLatexService;
  let repository: InMemoryResumeRepository;

  const mockResume = {
    ...createMockResume({
      id: 'resume-123',
      userId: 'user-456',
      title: 'My Resume',
      jobTitle: 'Software Engineer',
      slug: 'john-doe',
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
        sectionType: {
          key: 'experience',
          semanticKind: 'WORK_EXPERIENCE',
          title: 'Experience',
        },
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
        sectionType: {
          key: 'education',
          semanticKind: 'EDUCATION',
          title: 'Education',
        },
        items: [
          {
            content: {
              degree: 'Computer Science',
              institution: 'MIT',
              startDate: new Date('2015-01-01'),
              endDate: new Date('2019-01-01'),
            },
          },
        ],
      },
      {
        sectionType: {
          key: 'skills',
          semanticKind: 'SKILL_SET',
          title: 'Skills',
        },
        items: [
          { content: { name: 'TypeScript', level: 4 } },
          { content: { name: 'Node.js', level: 3 } },
        ],
      },
      {
        sectionType: {
          key: 'projects',
          semanticKind: 'PROJECT',
          title: 'Projects',
        },
        items: [
          {
            content: {
              name: 'Portfolio Platform',
              description: 'Built with NestJS',
            },
          },
        ],
      },
      {
        sectionType: {
          key: 'languages',
          semanticKind: 'LANGUAGE',
          title: 'Languages',
        },
        items: [{ content: { name: 'English', level: 'FLUENT' } }],
      },
    ],
  };

  beforeEach(async () => {
    repository = new InMemoryResumeRepository();
    repository.seedResume(mockResume);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeLatexService,
        {
          provide: PrismaService,
          useValue: {
            resume: {
              findUnique: (args: { where: { id: string } }) => repository.findUnique(args.where.id),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ResumeLatexService>(ResumeLatexService);
  });

  describe('exportAsLatex', () => {
    it('should generate valid LaTeX document', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('\\documentclass');
      expect(result).toContain('\\begin{document}');
      expect(result).toContain('\\end{document}');
    });

    it('should include personal information', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('John Doe');
      expect(result).toContain('john@example.com');
    });

    it('should include work experience section', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('Senior Developer');
      expect(result).toContain('Tech Corp');
    });

    it('should include education section', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('Computer Science');
      expect(result).toContain('MIT');
    });

    it('should include skills section', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('TypeScript');
      expect(result).toContain('Node.js');
    });

    it('should include project section', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('Projects');
      expect(result).toContain('Portfolio Platform');
    });

    it('should include language section', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('Languages');
      expect(result).toContain('English');
    });

    it('should escape special LaTeX characters', async () => {
      // Seed with special characters
      const resumeWithSpecialChars = {
        ...mockResume,
        resumeSections: [
          {
            sectionType: {
              key: 'experience',
              semanticKind: 'WORK_EXPERIENCE',
              title: 'Experience',
            },
            items: [
              {
                content: {
                  position: 'Senior Developer',
                  company: 'Tech & Co',
                  startDate: new Date('2020-01-01'),
                  endDate: null,
                  isCurrent: true,
                  description: '100% awesome',
                },
              },
            ],
          },
        ],
      };
      repository.clear();
      repository.seedResume(resumeWithSpecialChars);

      const result = await service.exportAsLatex('resume-123');

      // & should be escaped as \&
      expect(result).toContain('\\&');
      // % should be escaped as \%
      expect(result).toContain('\\%');
    });

    it('should throw NotFoundException when resume not found', async () => {
      repository.clear();

      await expect(service.exportAsLatex('unknown')).rejects.toThrow('Resume not found');
    });
  });

  describe('exportAsBuffer', () => {
    it('should return LaTeX as Buffer', async () => {
      const result = await service.exportAsBuffer('resume-123');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toContain('\\documentclass');
    });
  });

  describe('Template options', () => {
    it('should support moderncv template', async () => {
      const result = await service.exportAsLatex('resume-123', {
        template: 'moderncv',
      });

      expect(result).toContain('moderncv');
      expect(result).toContain('\\makecvtitle');
    });

    it('should support simple template by default', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('\\documentclass[11pt,a4paper]{article}');
    });
  });
});
