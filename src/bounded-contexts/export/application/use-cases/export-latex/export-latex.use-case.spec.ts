import { beforeEach, describe, expect, it } from 'bun:test';
import { createMockResume } from '@test/shared/factories/resume.factory';
import type {
  ResumeDataRepositoryPort,
  ResumeForLatexExport,
} from '../../../domain/ports/resume-data.repository.port';
import { ExportLatexUseCase } from './export-latex.use-case';

/**
 * In-Memory Resume Data Repository for LaTeX testing
 */
class InMemoryResumeDataRepository implements Pick<ResumeDataRepositoryPort, 'findForJsonExport' | 'findForLatexExport'> {
  private resumes = new Map<string, ResumeForLatexExport>();

  async findForJsonExport(): Promise<null> {
    return null;
  }

  async findForLatexExport(resumeId: string): Promise<ResumeForLatexExport | null> {
    return this.resumes.get(resumeId) ?? null;
  }

  seedResume(id: string, resume: ResumeForLatexExport): void {
    this.resumes.set(id, resume);
  }

  clear(): void {
    this.resumes.clear();
  }
}

function buildLatexResume(overrides: Partial<ReturnType<typeof createMockResume>> = {}): ResumeForLatexExport {
  const base = createMockResume({
    id: 'resume-123',
    userId: 'user-456',
    title: 'My Resume',
    jobTitle: 'Software Engineer',
    slug: 'john-doe',
    isPublic: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
    ...overrides,
  });

  return {
    title: base.title,
    fullName: base.fullName,
    emailContact: base.emailContact,
    phone: base.phone,
    jobTitle: base.jobTitle,
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
    sections: [
      {
        semanticKind: 'WORK_EXPERIENCE',
        sectionTypeKey: 'experience',
        title: 'Experience',
        items: [
          {
            position: 'Senior Developer',
            company: 'Tech Corp',
            startDate: new Date('2020-01-01'),
            endDate: null,
            isCurrent: true,
            description: 'Building awesome stuff',
            skills: ['TypeScript', 'React'],
          },
        ],
      },
      {
        semanticKind: 'EDUCATION',
        sectionTypeKey: 'education',
        title: 'Education',
        items: [
          {
            degree: 'Computer Science',
            institution: 'MIT',
            startDate: new Date('2015-01-01'),
            endDate: new Date('2019-01-01'),
          },
        ],
      },
      {
        semanticKind: 'SKILL_SET',
        sectionTypeKey: 'skills',
        title: 'Skills',
        items: [
          { name: 'TypeScript', level: 4 },
          { name: 'Node.js', level: 3 },
        ],
      },
      {
        semanticKind: 'PROJECT',
        sectionTypeKey: 'projects',
        title: 'Projects',
        items: [
          {
            name: 'Portfolio Platform',
            description: 'Built with NestJS',
          },
        ],
      },
      {
        semanticKind: 'LANGUAGE',
        sectionTypeKey: 'languages',
        title: 'Languages',
        items: [{ name: 'English', level: 'FLUENT' }],
      },
    ],
  };
}

describe('ExportLatexUseCase', () => {
  let useCase: ExportLatexUseCase;
  let repository: InMemoryResumeDataRepository;

  beforeEach(() => {
    repository = new InMemoryResumeDataRepository();
    repository.seedResume('resume-123', buildLatexResume());

    useCase = new ExportLatexUseCase(repository as unknown as ResumeDataRepositoryPort);
  });

  describe('execute', () => {
    it('should generate valid LaTeX document', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('\\documentclass');
      expect(result).toContain('\\begin{document}');
      expect(result).toContain('\\end{document}');
    });

    it('should include personal information', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('John Doe');
      expect(result).toContain('john@example.com');
    });

    it('should include work experience section', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('Senior Developer');
      expect(result).toContain('Tech Corp');
    });

    it('should include education section', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('Computer Science');
      expect(result).toContain('MIT');
    });

    it('should include skills section', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('TypeScript');
      expect(result).toContain('Node.js');
    });

    it('should include project section', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('Projects');
      expect(result).toContain('Portfolio Platform');
    });

    it('should include language section', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('Languages');
      expect(result).toContain('English');
    });

    it('should escape special LaTeX characters', async () => {
      const specialResume = buildLatexResume();
      specialResume.sections = [
        {
          semanticKind: 'WORK_EXPERIENCE',
          sectionTypeKey: 'experience',
          title: 'Experience',
          items: [
            {
              position: 'Senior Developer',
              company: 'Tech & Co',
              startDate: new Date('2020-01-01'),
              endDate: null,
              isCurrent: true,
              description: '100% awesome',
            },
          ],
        },
      ];
      repository.clear();
      repository.seedResume('resume-123', specialResume);

      const result = await useCase.execute({ resumeId: 'resume-123' });

      // & should be escaped as \&
      expect(result).toContain('\\&');
      // % should be escaped as \%
      expect(result).toContain('\\%');
    });

    it('should throw NotFoundException when resume not found', async () => {
      repository.clear();

      await expect(useCase.execute({ resumeId: 'unknown' })).rejects.toThrow('Resume not found');
    });
  });

  describe('executeAsBuffer', () => {
    it('should return LaTeX as Buffer', async () => {
      const result = await useCase.executeAsBuffer({ resumeId: 'resume-123' });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toContain('\\documentclass');
    });
  });

  describe('Template options', () => {
    it('should support moderncv template', async () => {
      const result = await useCase.execute({
        resumeId: 'resume-123',
        template: 'moderncv',
      });

      expect(result).toContain('moderncv');
      expect(result).toContain('\\makecvtitle');
    });

    it('should support simple template by default', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toContain('\\documentclass[11pt,a4paper]{article}');
    });
  });
});
