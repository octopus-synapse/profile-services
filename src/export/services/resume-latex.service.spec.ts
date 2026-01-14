import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ResumeLatexService } from './resume-latex.service';

describe('ResumeLatexService', () => {
  let service: ResumeLatexService;
  let mockPrismaService: {
    resume: { findUnique: ReturnType<typeof mock> };
  };

  const mockResume = {
    id: 'resume-123',
    userId: 'user-456',
    title: 'My Resume',
    jobTitle: 'Software Engineer',
    slug: 'john-doe',
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
        startDate: new Date('2015-01-01'),
        endDate: new Date('2019-01-01'),
      },
    ],
    skills: [
      { id: 'skill-1', name: 'TypeScript', level: 4 },
      { id: 'skill-2', name: 'Node.js', level: 3 },
    ],
  };

  beforeEach(() => {
    mockPrismaService = {
      resume: {
        findUnique: mock(() => Promise.resolve(mockResume)),
      },
    };

    service = new ResumeLatexService(mockPrismaService as any);
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

    it('should escape special LaTeX characters', async () => {
      // Mock with special characters
      const resumeWithSpecialChars = {
        ...mockResume,
        experiences: [
          {
            ...mockResume.experiences[0],
            company: 'Tech & Co',
            description: '100% awesome',
          },
        ],
      };
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve(resumeWithSpecialChars),
      );

      const result = await service.exportAsLatex('resume-123');

      // & should be escaped as \&
      expect(result).toContain('\\&');
      // % should be escaped as \%
      expect(result).toContain('\\%');
    });

    it('should throw NotFoundException when resume not found', async () => {
      mockPrismaService.resume.findUnique = mock(() => Promise.resolve(null));

      await expect(service.exportAsLatex('unknown')).rejects.toThrow(
        'Resume not found',
      );
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
