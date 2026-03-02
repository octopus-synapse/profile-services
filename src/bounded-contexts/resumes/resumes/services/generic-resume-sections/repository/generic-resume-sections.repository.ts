import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { GenericResumeSectionsRepositoryPort } from '../ports/generic-resume-sections-repository.port';

type PrismaLikeClient = PrismaService | Prisma.TransactionClient;

export class GenericResumeSectionsRepository extends GenericResumeSectionsRepositoryPort {
  constructor(private readonly prisma: PrismaLikeClient) {
    super();
  }

  runInTransaction<T>(
    operation: (repository: GenericResumeSectionsRepository) => Promise<T>,
  ): Promise<T> {
    const prismaWithTransaction = this.prisma as PrismaService;

    if (typeof prismaWithTransaction.$transaction !== 'function') {
      return operation(this);
    }

    return prismaWithTransaction.$transaction((transactionClient) =>
      operation(new GenericResumeSectionsRepository(transactionClient)),
    );
  }

  findActiveSectionTypes() {
    return this.prisma.sectionType.findMany({
      where: { isActive: true },
      orderBy: [{ semanticKind: 'asc' }, { title: 'asc' }, { version: 'desc' }],
    });
  }

  findResumeOwner(resumeId: string) {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { id: true, userId: true },
    });
  }

  findResumeSections(resumeId: string) {
    return this.prisma.resumeSection.findMany({
      where: { resumeId },
      include: {
        sectionType: true,
        items: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  findActiveSectionTypeByKey(sectionTypeKey: string) {
    return this.prisma.sectionType.findFirst({
      where: {
        key: sectionTypeKey,
        isActive: true,
      },
    });
  }

  findResumeSection(resumeId: string, sectionTypeId: string) {
    return this.prisma.resumeSection.findUnique({
      where: {
        resumeId_sectionTypeId: {
          resumeId,
          sectionTypeId,
        },
      },
    });
  }

  createResumeSection(resumeId: string, sectionTypeId: string, order: number) {
    return this.prisma.resumeSection.create({
      data: {
        resumeId,
        sectionTypeId,
        order,
      },
    });
  }

  countSectionItems(resumeSectionId: string) {
    return this.prisma.sectionItem.count({
      where: { resumeSectionId },
    });
  }

  findSectionItemForResumeAndType(itemId: string, resumeId: string, sectionTypeId: string) {
    return this.prisma.sectionItem.findFirst({
      where: {
        id: itemId,
        resumeSection: {
          resumeId,
          sectionTypeId,
        },
      },
      select: { id: true },
    });
  }

  createSectionItem(resumeSectionId: string, order: number, content: Prisma.InputJsonValue) {
    return this.prisma.sectionItem.create({
      data: {
        resumeSectionId,
        order,
        content,
      },
    });
  }

  updateSectionItem(itemId: string, content: Prisma.InputJsonValue) {
    return this.prisma.sectionItem.update({
      where: { id: itemId },
      data: {
        content,
      },
    });
  }

  deleteSectionItem(itemId: string) {
    return this.prisma.sectionItem.delete({ where: { id: itemId } });
  }

  findMaxResumeSectionOrder(resumeId: string) {
    return this.prisma.resumeSection.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
  }

  findMaxSectionItemOrder(resumeSectionId: string) {
    return this.prisma.sectionItem.aggregate({
      where: { resumeSectionId },
      _max: { order: true },
    });
  }
}
