import { beforeEach, describe, expect, it } from 'bun:test';
import { createMockResume } from '@test/shared/factories/resume.factory';
import type {
  ResumeDataRepositoryPort,
  ResumeForJsonExport,
} from '../../../domain/ports/resume-data.repository.port';
import { ExportJsonUseCase } from './export-json.use-case';

type JsonResumeLike = {
  $schema: string;
  basics: {
    name: string;
    email?: string;
  };
  sections: Array<{
    semanticKind: string;
    items: Record<string, unknown>[];
  }>;
};

type ProfileExportLike = {
  format: 'profile';
  version: string;
  resume: {
    sections: unknown[];
  };
};

function isJsonResumeLike(value: unknown): value is JsonResumeLike {
  if (!value || typeof value !== 'object') return false;
  if (!('$schema' in value) || !('basics' in value) || !('sections' in value)) return false;
  const maybeSections = (value as { sections?: unknown }).sections;
  return Array.isArray(maybeSections);
}

function isProfileExportLike(value: unknown): value is ProfileExportLike {
  if (!value || typeof value !== 'object') return false;
  if (!('format' in value) || !('resume' in value)) return false;
  const format = (value as { format?: unknown }).format;
  const resume = (value as { resume?: unknown }).resume;
  if (format !== 'profile' || !resume || typeof resume !== 'object') return false;
  return Array.isArray((resume as { sections?: unknown }).sections);
}

/**
 * In-Memory Resume Data Repository for testing
 */
class InMemoryResumeDataRepository implements Pick<ResumeDataRepositoryPort, 'findForJsonExport' | 'findForLatexExport'> {
  private resumes = new Map<string, ResumeForJsonExport>();

  async findForJsonExport(resumeId: string): Promise<ResumeForJsonExport | null> {
    return this.resumes.get(resumeId) ?? null;
  }

  async findForLatexExport(): Promise<null> {
    return null;
  }

  seedResume(resume: ResumeForJsonExport & { resumeSections?: unknown }): void {
    // Transform the test data format into the port format
    const sections = (resume as unknown as {
      resumeSections: Array<{
        sectionType: { semanticKind: string };
        items: Array<{ content: Record<string, unknown> }>;
      }>;
    }).resumeSections?.map((rs) => ({
      semanticKind: rs.sectionType.semanticKind,
      items: rs.items.map((item) => ({
        content: item.content,
      })),
    })) ?? resume.sections;

    this.resumes.set(resume.id, {
      ...resume,
      sections,
    });
  }

  clear(): void {
    this.resumes.clear();
  }
}

describe('ExportJsonUseCase', () => {
  let useCase: ExportJsonUseCase;
  let repository: InMemoryResumeDataRepository;

  const mockResume = {
    ...createMockResume({
      id: 'resume-123',
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
        sectionType: { key: 'experience', semanticKind: 'WORK_EXPERIENCE', title: 'Experience' },
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
        sectionType: { key: 'education', semanticKind: 'EDUCATION', title: 'Education' },
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
        sectionType: { key: 'skills', semanticKind: 'SKILL_SET', title: 'Skills' },
        items: [
          { content: { name: 'TypeScript', level: 4 } },
          { content: { name: 'Node.js', level: 3 } },
        ],
      },
      {
        sectionType: { key: 'languages', semanticKind: 'LANGUAGE', title: 'Languages' },
        items: [
          { content: { name: 'English', level: 'FLUENT' } },
          { content: { name: 'Portuguese', level: 'NATIVE' } },
        ],
      },
      {
        sectionType: { key: 'opensource', semanticKind: 'OPEN_SOURCE', title: 'Open Source' },
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
  };

  beforeEach(() => {
    repository = new InMemoryResumeDataRepository();
    repository.seedResume(mockResume);

    useCase = new ExportJsonUseCase(repository as unknown as ResumeDataRepositoryPort);
  });

  describe('execute', () => {
    it('should export resume as JSON Resume format', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(result).toBeDefined();
      expect(isJsonResumeLike(result)).toBe(true);
      if (!isJsonResumeLike(result)) {
        throw new Error('Expected JSON Resume format');
      }
      expect(result.$schema).toBe(
        'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      );
    });

    it('should include basics section with personal info', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(isJsonResumeLike(result)).toBe(true);
      if (!isJsonResumeLike(result)) {
        throw new Error('Expected JSON Resume format');
      }

      expect(result.basics).toBeDefined();
      expect(result.basics.name).toBe('John Doe');
      expect(result.basics.email).toBe('john@example.com');
    });

    it('should include generic sections', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(isJsonResumeLike(result)).toBe(true);
      if (!isJsonResumeLike(result)) {
        throw new Error('Expected JSON Resume format');
      }

      expect(result.sections).toBeDefined();
      expect(result.sections).toHaveLength(5);
      expect(result.sections[0].semanticKind).toBe('WORK_EXPERIENCE');
      expect(result.sections[0].items).toHaveLength(1);
    });

    it('should preserve section item content', async () => {
      const result = await useCase.execute({ resumeId: 'resume-123' });

      expect(isJsonResumeLike(result)).toBe(true);
      if (!isJsonResumeLike(result)) {
        throw new Error('Expected JSON Resume format');
      }

      const workSection = result.sections.find(
        (section: { semanticKind: string }) => section.semanticKind === 'WORK_EXPERIENCE',
      );

      expect(workSection).toBeDefined();
      if (!workSection) {
        throw new Error('Expected WORK_EXPERIENCE section');
      }
      expect(workSection.items[0].position).toBe('Senior Developer');
      expect(workSection.items[0].company).toBe('Tech Corp');
    });

    it('should throw NotFoundException when resume not found', async () => {
      repository.clear();

      await expect(useCase.execute({ resumeId: 'unknown' })).rejects.toThrow('Resume not found');
    });
  });

  describe('executeAsBuffer', () => {
    it('should return JSON as Buffer', async () => {
      const result = await useCase.executeAsBuffer({ resumeId: 'resume-123' });

      expect(result).toBeInstanceOf(Buffer);
      const parsed = JSON.parse(result.toString());
      expect(parsed.$schema).toBeDefined();
    });
  });

  describe('Custom ProFile format', () => {
    it('should export in ProFile custom format when specified', async () => {
      const result = await useCase.execute({
        resumeId: 'resume-123',
        format: 'profile',
      });

      expect(isProfileExportLike(result)).toBe(true);
      if (!isProfileExportLike(result)) {
        throw new Error('Expected Profile format');
      }

      expect(result.format).toBe('profile');
      expect(result.version).toBe('1.0');
      expect(result.resume.sections).toBeDefined();
      expect(result.resume.sections).toHaveLength(5);
    });
  });
});
