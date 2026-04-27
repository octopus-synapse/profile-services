import { Prisma, type ProgrammingLanguage } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import {
  type AdminProgrammingLanguagesListQuery,
  AdminProgrammingLanguagesRepositoryPort,
} from '../../../domain/ports/admin-programming-languages.repository.port';

export class PrismaAdminProgrammingLanguagesRepository extends AdminProgrammingLanguagesRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findAll(query: AdminProgrammingLanguagesListQuery) {
    const where: Prisma.ProgrammingLanguageWhereInput = {};
    if (query.search) where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return paginate<ProgrammingLanguage>(this.prisma.programmingLanguage, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(slug: string) {
    return this.prisma.programmingLanguage.findUnique({ where: { slug } });
  }

  async create(input: Record<string, unknown>) {
    return this.prisma.programmingLanguage.create({
      data: {
        slug: input.slug as string,
        nameEn: input.nameEn as string,
        namePtBr: input.namePtBr as string,
        descriptionEn: (input.descriptionEn as string) ?? null,
        descriptionPtBr: (input.descriptionPtBr as string) ?? null,
        icon: (input.icon as string) ?? null,
        color: (input.color as string) ?? null,
        website: (input.website as string) ?? null,
        paradigms: (input.paradigms as string[]) ?? [],
        typing: (input.typing as string) ?? null,
        aliases: (input.aliases as string[]) ?? [],
        fileExtensions: (input.fileExtensions as string[]) ?? [],
        popularity: (input.popularity as number) ?? 0,
        order: (input.order as number) ?? 0,
        isActive: (input.isActive as boolean) ?? true,
      },
    });
  }

  async update(slug: string, input: Record<string, unknown>) {
    return this.prisma.programmingLanguage.update({
      where: { slug },
      data: patchData(input, [
        'slug',
        'nameEn',
        'namePtBr',
        'descriptionEn',
        'descriptionPtBr',
        'icon',
        'color',
        'website',
        'paradigms',
        'typing',
        'aliases',
        'fileExtensions',
        'popularity',
        'order',
        'isActive',
      ]),
    });
  }

  async delete(slug: string) {
    await this.prisma.programmingLanguage.delete({ where: { slug } });
  }
}
