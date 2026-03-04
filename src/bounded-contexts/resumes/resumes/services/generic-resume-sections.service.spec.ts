import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, mock } from 'bun:test';
import { buildGenericResumeSectionsUseCases } from './generic-resume-sections/generic-resume-sections.composition';
import { GenericResumeSectionsService } from './generic-resume-sections.service';
import { SectionDefinitionZodFactory } from './section-definition-zod.factory';

function createServiceWithPrismaMock(prisma: unknown) {
  const schemaFactory = new SectionDefinitionZodFactory();
  const useCases = buildGenericResumeSectionsUseCases(
    prisma as never,
    schemaFactory,
  );
  return new GenericResumeSectionsService(useCases);
}

describe('GenericResumeSectionsService', () => {
  it('enforces maxItems from section definition constraints', async () => {
    const prisma = {
      resume: {
        findUnique: mock(async () => ({ id: 'resume-1', userId: 'user-1' })),
      },
      sectionType: {
        findFirst: mock(async () => ({
          id: 'section-type-1',
          key: 'summary_v2',
          maxItems: null,
          definition: {
            schemaVersion: 1,
            kind: 'SUMMARY',
            constraints: {
              maxItems: 1,
            },
            fields: [{ key: 'text', type: 'string', required: true }],
          },
        })),
      },
      resumeSection: {
        findUnique: mock(async () => ({ id: 'resume-section-1' })),
        aggregate: mock(async () => ({ _max: { order: 0 } })),
        create: mock(async () => ({ id: 'resume-section-1' })),
      },
      sectionItem: {
        count: mock(async () => 1),
        aggregate: mock(async () => ({ _max: { order: 0 } })),
        create: mock(async () => ({ id: 'item-1' })),
      },
    } as unknown as ConstructorParameters<
      typeof GenericResumeSectionsService
    >[0];

    const service = createServiceWithPrismaMock(prisma);

    await expect(
      service.createItem('resume-1', 'summary_v2', 'user-1', {
        text: 'Senior engineer with 10 years of experience',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('enforces single item when definition disallows multiple items', async () => {
    const prisma = {
      resume: {
        findUnique: mock(async () => ({ id: 'resume-1', userId: 'user-1' })),
      },
      sectionType: {
        findFirst: mock(async () => ({
          id: 'section-type-1',
          key: 'summary_v1',
          maxItems: null,
          definition: {
            schemaVersion: 1,
            kind: 'SUMMARY',
            constraints: {
              allowsMultipleItems: false,
            },
            fields: [{ key: 'text', type: 'string', required: true }],
          },
        })),
      },
      resumeSection: {
        findUnique: mock(async () => ({ id: 'resume-section-1' })),
      },
      sectionItem: {
        count: mock(async () => 1),
      },
    } as unknown as ConstructorParameters<
      typeof GenericResumeSectionsService
    >[0];

    const service = createServiceWithPrismaMock(prisma);

    await expect(
      service.createItem('resume-1', 'summary_v1', 'user-1', {
        text: 'Another summary',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates resume section automatically when missing', async () => {
    const prisma = {
      resume: {
        findUnique: mock(async () => ({ id: 'resume-1', userId: 'user-1' })),
      },
      sectionType: {
        findFirst: mock(async () => ({
          id: 'section-type-1',
          key: 'work_experience_v1',
          maxItems: null,
          definition: {
            schemaVersion: 1,
            kind: 'WORK_EXPERIENCE',
            fields: [{ key: 'company', type: 'string', required: true }],
          },
        })),
      },
      resumeSection: {
        findUnique: mock(async () => null),
        aggregate: mock(async () => ({ _max: { order: 2 } })),
        create: mock(async () => ({ id: 'resume-section-new', order: 3 })),
      },
      sectionItem: {
        count: mock(async () => 0),
        aggregate: mock(async () => ({ _max: { order: null } })),
        create: mock(async () => ({ id: 'item-1', order: 0 })),
      },
    } as unknown as ConstructorParameters<
      typeof GenericResumeSectionsService
    >[0];

    const service = createServiceWithPrismaMock(prisma);

    const created = await service.createItem(
      'resume-1',
      'work_experience_v1',
      'user-1',
      {
        company: 'Octopus',
      },
    );

    expect(created.id).toBe('item-1');
    expect(prisma.resumeSection.create).toHaveBeenCalled();
  });

  it('throws ForbiddenException when user does not own resume', async () => {
    const prisma = {
      resume: {
        findUnique: mock(async () => ({ id: 'resume-1', userId: 'user-2' })),
      },
      resumeSection: {
        findMany: mock(async () => []),
      },
    } as unknown as ConstructorParameters<
      typeof GenericResumeSectionsService
    >[0];

    const service = createServiceWithPrismaMock(prisma);

    await expect(
      service.listResumeSections('resume-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when updating missing section item', async () => {
    const prisma = {
      resume: {
        findUnique: mock(async () => ({ id: 'resume-1', userId: 'user-1' })),
      },
      sectionType: {
        findFirst: mock(async () => ({
          id: 'section-type-1',
          key: 'summary_v1',
          maxItems: null,
          definition: {
            schemaVersion: 1,
            kind: 'SUMMARY',
            fields: [{ key: 'text', type: 'string', required: true }],
          },
        })),
      },
      sectionItem: {
        findFirst: mock(async () => null),
      },
    } as unknown as ConstructorParameters<
      typeof GenericResumeSectionsService
    >[0];

    const service = createServiceWithPrismaMock(prisma);

    await expect(
      service.updateItem('resume-1', 'summary_v1', 'item-missing', 'user-1', {
        text: 'updated',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
