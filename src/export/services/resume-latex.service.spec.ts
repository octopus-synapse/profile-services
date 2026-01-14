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
    titleEn: 'Software Engineer',
    slug: 'john-doe',
    user: {
      id: 'user-456',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
    experiences: [
      {
        id: 'exp-1',
        titleEn: 'Senior Developer',
        companyEn: 'Tech Corp',
        startDate: new Date('2020-01-01'),
        endDate: null,
        isPresent: true,
        descriptionEn: 'Building awesome stuff with React & Node.js',
      },
    ],
    education: [
      {
        id: 'edu-1',
        degreeEn: 'B.S. Computer Science',
        institutionEn: 'MIT',
        startDate: new Date('2015-01-01'),
        endDate: new Date('2019-01-01'),
      },
    ],
    skills: [
      { id: 'skill-1', nameEn: 'TypeScript', level: 'EXPERT' },
      { id: 'skill-2', nameEn: 'C++', level: 'ADVANCED' },
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
    });

    it('should escape special LaTeX characters', async () => {
      const result = await service.exportAsLatex('resume-123');

      // & should be escaped as \&
      expect(result).toContain('\\&');
      // C++ doesn't need escaping, should remain as is
      expect(result).toContain('C++');
    });

    it('should throw NotFoundException when resume not found', async () => {
      mockPrismaService.resume.findUnique = mock(() => Promise.resolve(null));

      await expect(service.exportAsLatex('non-existent')).rejects.toThrow(
        'Resume not found',
      );
    });
  });

  describe('exportAsBuffer', () => {
    it('should return LaTeX as Buffer', async () => {
      const buffer = await service.exportAsBuffer('resume-123');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toContain('\\documentclass');
    });
  });

  describe('Template options', () => {
    it('should support moderncv template', async () => {
      const result = await service.exportAsLatex('resume-123', {
        template: 'moderncv',
      });

      expect(result).toContain('moderncv');
    });

    it('should support simple template by default', async () => {
      const result = await service.exportAsLatex('resume-123');

      expect(result).toContain('article');
    });
  });
});
