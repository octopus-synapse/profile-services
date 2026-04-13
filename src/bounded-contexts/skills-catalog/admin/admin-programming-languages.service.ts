import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminProgrammingLanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProgrammingLanguageWhereInput = {};

    if (query.search) {
      where.OR = [
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { namePtBr: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.programmingLanguage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { order: 'asc' },
      }),
      this.prisma.programmingLanguage.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(slug: string) {
    const item = await this.prisma.programmingLanguage.findUnique({ where: { slug } });
    if (!item) throw new NotFoundException(`Programming language '${slug}' not found`);
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
    if (!existing) throw new NotFoundException(`Programming language '${slug}' not found`);

    const data: Record<string, unknown> = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.namePtBr !== undefined) data.namePtBr = dto.namePtBr;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionPtBr !== undefined) data.descriptionPtBr = dto.descriptionPtBr;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.paradigms !== undefined) data.paradigms = dto.paradigms;
    if (dto.typing !== undefined) data.typing = dto.typing;
    if (dto.aliases !== undefined) data.aliases = dto.aliases;
    if (dto.fileExtensions !== undefined) data.fileExtensions = dto.fileExtensions;
    if (dto.popularity !== undefined) data.popularity = dto.popularity;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.programmingLanguage.update({ where: { slug }, data });
  }

  async remove(slug: string) {
    const existing = await this.prisma.programmingLanguage.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException(`Programming language '${slug}' not found`);

    await this.prisma.programmingLanguage.delete({ where: { slug } });
  }
}
