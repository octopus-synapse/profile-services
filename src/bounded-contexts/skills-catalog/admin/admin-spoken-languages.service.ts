import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';

@Injectable()
export class AdminSpokenLanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const where: Prisma.SpokenLanguageWhereInput = {};

    if (query.search) {
      where.OR = searchWhere(query.search, ['nameEn', 'namePtBr', 'nameEs']);
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return paginate(this.prisma.spokenLanguage, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(code: string) {
    const item = await this.prisma.spokenLanguage.findUnique({ where: { code } });
    if (!item) throw new EntityNotFoundException('SpokenLanguage', code);
    return item;
  }

  async create(dto: Record<string, unknown>) {
    return this.prisma.spokenLanguage.create({
      data: {
        code: dto.code as string,
        nameEn: dto.nameEn as string,
        namePtBr: dto.namePtBr as string,
        nameEs: dto.nameEs as string,
        nativeName: (dto.nativeName as string) ?? null,
        order: (dto.order as number) ?? 0,
        isActive: (dto.isActive as boolean) ?? true,
      },
    });
  }

  async update(code: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.spokenLanguage.findUnique({ where: { code } });
    if (!existing) throw new EntityNotFoundException('SpokenLanguage', code);

    const data = patchData(dto, [
      'nameEn',
      'namePtBr',
      'nameEs',
      'nativeName',
      'order',
      'isActive',
    ]);

    return this.prisma.spokenLanguage.update({ where: { code }, data });
  }

  async remove(code: string) {
    const existing = await this.prisma.spokenLanguage.findUnique({ where: { code } });
    if (!existing) throw new EntityNotFoundException('SpokenLanguage', code);

    await this.prisma.spokenLanguage.delete({ where: { code } });
  }
}
