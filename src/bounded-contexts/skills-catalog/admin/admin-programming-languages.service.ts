import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { paginate, patchData, searchWhere } from '@/shared-kernel/database';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';

@Injectable()
export class AdminProgrammingLanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const where: Prisma.ProgrammingLanguageWhereInput = {};

    if (query.search) {
      where.OR = searchWhere(query.search, ['nameEn', 'namePtBr']);
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return paginate(this.prisma.programmingLanguage, {
      page: query.page,
      pageSize: query.pageSize,
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(slug: string) {
    const item = await this.prisma.programmingLanguage.findUnique({ where: { slug } });
    if (!item) throw new EntityNotFoundException('ProgrammingLanguage', slug);
    return item;
  }

  async create(dto: Record<string, unknown>) {
    return this.prisma.programmingLanguage.create({
      data: {
        slug: dto.slug as string,
        nameEn: dto.nameEn as string,
        namePtBr: dto.namePtBr as string,
        descriptionEn: (dto.descriptionEn as string) ?? null,
        descriptionPtBr: (dto.descriptionPtBr as string) ?? null,
        icon: (dto.icon as string) ?? null,
        color: (dto.color as string) ?? null,
        website: (dto.website as string) ?? null,
        paradigms: (dto.paradigms as string[]) ?? [],
        typing: (dto.typing as string) ?? null,
        aliases: (dto.aliases as string[]) ?? [],
        fileExtensions: (dto.fileExtensions as string[]) ?? [],
        popularity: (dto.popularity as number) ?? 0,
        order: (dto.order as number) ?? 0,
        isActive: (dto.isActive as boolean) ?? true,
      },
    });
  }

  async update(slug: string, dto: Record<string, unknown>) {
    const existing = await this.prisma.programmingLanguage.findUnique({ where: { slug } });
    if (!existing) throw new EntityNotFoundException('ProgrammingLanguage', slug);

    const data = patchData(dto, [
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
    ]);

    return this.prisma.programmingLanguage.update({ where: { slug }, data });
  }

  async remove(slug: string) {
    const existing = await this.prisma.programmingLanguage.findUnique({ where: { slug } });
    if (!existing) throw new EntityNotFoundException('ProgrammingLanguage', slug);

    await this.prisma.programmingLanguage.delete({ where: { slug } });
  }
}
