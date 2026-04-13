import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminSpokenLanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where: Prisma.SpokenLanguageWhereInput = {};

    if (query.search) {
      where.OR = [
        { nameEn: { contains: query.search, mode: 'insensitive' } },
        { namePtBr: { contains: query.search, mode: 'insensitive' } },
        { nameEs: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.spokenLanguage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { order: 'asc' },
      }),
      this.prisma.spokenLanguage.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(code: string) {
    const item = await this.prisma.spokenLanguage.findUnique({ where: { code } });
    if (!item) throw new NotFoundException(`Spoken language '${code}' not found`);
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
    if (!existing) throw new NotFoundException(`Spoken language '${code}' not found`);

    const data: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.namePtBr !== undefined) data.namePtBr = dto.namePtBr;
    if (dto.nameEs !== undefined) data.nameEs = dto.nameEs;
    if (dto.nativeName !== undefined) data.nativeName = dto.nativeName;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.spokenLanguage.update({ where: { code }, data });
  }

  async remove(code: string) {
    const existing = await this.prisma.spokenLanguage.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException(`Spoken language '${code}' not found`);

    await this.prisma.spokenLanguage.delete({ where: { code } });
  }
}
