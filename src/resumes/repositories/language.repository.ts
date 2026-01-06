import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Language } from '@prisma/client';
import { CreateLanguageDto, UpdateLanguageDto } from '../dto/language.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { PAGINATION } from '../../common/constants/validation/pagination.const';

/**
 * Ordering strategy: by user-defined order field (asc)
 *
 * Rationale: Languages should be ordered by proficiency or preference as the user decides.
 * Unlike date-based entities, there is no natural chronological order for languages,
 * so explicit user control via the order field is the most appropriate strategy.
 */
@Injectable()
export class LanguageRepository {
  private readonly logger = new Logger(LanguageRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<Language>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.language.findMany({
        where: { resumeId },
        orderBy: { order: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.language.count({ where: { resumeId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string, resumeId: string): Promise<Language | null> {
    return this.prisma.language.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateLanguageDto): Promise<Language> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.language.create({
      data: {
        resumeId,
        name: data.name,
        level: data.level,
        cefrLevel: data.cefrLevel ?? null,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateLanguageDto,
  ): Promise<Language | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.language.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.level && { level: data.level }),
        ...(data.cefrLevel !== undefined && { cefrLevel: data.cefrLevel }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.language.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.language.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.language.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
