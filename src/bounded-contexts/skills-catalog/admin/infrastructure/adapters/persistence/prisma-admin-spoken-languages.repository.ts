import { Prisma, type SpokenLanguage } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import {
  type AdminSpokenLanguagesListQuery,
  AdminSpokenLanguagesRepositoryPort,
} from '../../../domain/ports/admin-spoken-languages.repository.port';

export class PrismaAdminSpokenLanguagesRepository extends AdminSpokenLanguagesRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findAll(query: AdminSpokenLanguagesListQuery) {
    const where: Prisma.SpokenLanguageWhereInput = {};
    if (query.search) where.OR = searchWhere(query.search, ['nameEn', 'namePtBr', 'nameEs']);
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return paginate<SpokenLanguage>(this.prisma.spokenLanguage, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(code: string) {
    return this.prisma.spokenLanguage.findUnique({ where: { code } });
  }

  async create(input: Record<string, unknown>) {
    return this.prisma.spokenLanguage.create({
      data: {
        code: input.code as string,
        nameEn: input.nameEn as string,
        namePtBr: input.namePtBr as string,
        nameEs: input.nameEs as string,
        nativeName: (input.nativeName as string) ?? null,
        order: (input.order as number) ?? 0,
        isActive: (input.isActive as boolean) ?? true,
      },
    });
  }

  async update(code: string, input: Record<string, unknown>) {
    return this.prisma.spokenLanguage.update({
      where: { code },
      data: patchData(input, [
        'nameEn',
        'namePtBr',
        'nameEs',
        'nativeName',
        'order',
        'isActive',
      ]),
    });
  }

  async delete(code: string) {
    await this.prisma.spokenLanguage.delete({ where: { code } });
  }
}
