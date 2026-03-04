import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { ResumeManagementService } from './resume-management.service';
import type {
  ResumeManagementUseCases,
  ResumeListItem,
  ResumeDetails,
} from './resume-management/ports/resume-management.port';

describe('ResumeManagementService (Facade)', () => {
  let service: ResumeManagementService;
  let useCases: ResumeManagementUseCases;

  beforeEach(() => {
    const mockResumeListItem = {
      id: 'r-1',
      title: 'Engenheiro de Software',
      slug: 'engenheiro-software',
      summary: 'Experiência em desenvolvimento',
      userId: 'user-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      resumeSections: [],
      _count: {
        resumeSections: 0,
      },
    } as unknown as ResumeListItem;

    const mockResumeDetails = {
      id: 'r-1',
      title: 'Engenheiro de Software',
      slug: 'engenheiro-software',
      summary: 'Experiência em desenvolvimento',
      userId: 'user-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      user: {
        id: 'user-1',
        email: 'joao@email.com',
        name: 'João Silva',
      },
      resumeSections: [],
    } as unknown as ResumeDetails;

    useCases = {
      listResumesForUserUseCase: {
        execute: mock(
          async (userId: string): Promise<{ resumes: ResumeListItem[] }> => {
            return { resumes: [mockResumeListItem] };
          },
        ),
      },
      getResumeDetailsUseCase: {
        execute: mock(async (resumeId: string): Promise<ResumeDetails> => {
          return mockResumeDetails;
        }),
      },
      deleteResumeUseCase: {
        execute: mock(async (resumeId: string): Promise<void> => {
          return undefined;
        }),
      },
    };

    service = new ResumeManagementService(useCases);
  });

  it('delegates listResumesForUser to use case', async () => {
    const result = await service.listResumesForUser('user-1');

    expect(useCases.listResumesForUserUseCase.execute).toHaveBeenCalledWith(
      'user-1',
    );

    expect(result).toBeTruthy();
    expect(result.resumes).toBeArray();
    expect(result.resumes.length).toBe(1);

    const resume = result.resumes[0];

    expect(resume.id).toBe('r-1');
    expect(resume.title).toBe('Engenheiro de Software');
    expect(resume.slug).toBe('engenheiro-software');
    expect(resume.summary).toBe('Experiência em desenvolvimento');
    expect(resume.userId).toBe('user-1');
    expect(resume.createdAt).toBeInstanceOf(Date);
    expect(resume.updatedAt).toBeInstanceOf(Date);
    expect(resume.resumeSections).toBeArray();
    expect(resume._count).toBeTruthy();
    expect(resume._count.resumeSections).toBe(0);
  });

  it('delegates getResumeDetails to use case', async () => {
    const result = await service.getResumeDetails('resume-1');

    expect(useCases.getResumeDetailsUseCase.execute).toHaveBeenCalledWith(
      'resume-1',
    );

    expect(result).toBeTruthy();
    expect(result.id).toBe('r-1');
    expect(result.title).toBe('Engenheiro de Software');
    expect(result.slug).toBe('engenheiro-software');
    expect(result.summary).toBe('Experiência em desenvolvimento');
    expect(result.userId).toBe('user-1');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.user).toBeTruthy();
    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('joao@email.com');
    expect(result.user.name).toBe('João Silva');
    expect(result.resumeSections).toBeArray();
  });

  it('delegates deleteResume to use case and returns void', async () => {
    const result = await service.deleteResume('resume-1');

    expect(useCases.deleteResumeUseCase.execute).toHaveBeenCalledWith(
      'resume-1',
    );
    expect(result).toBeUndefined();
  });

  it('propagates errors from listResumesForUser use case', async () => {
    useCases.listResumesForUserUseCase.execute = mock(
      async (userId: string): Promise<{ resumes: ResumeListItem[] }> => {
        throw new Error('boom');
      },
    );

    expect(service.listResumesForUser('user-1')).rejects.toThrow('boom');
  });

  it('propagates errors from deleteResume use case', async () => {
    useCases.deleteResumeUseCase.execute = mock(
      async (resumeId: string): Promise<void> => {
        throw new Error('cannot delete');
      },
    );

    expect(service.deleteResume('resume-1')).rejects.toThrow('cannot delete');
  });
});
