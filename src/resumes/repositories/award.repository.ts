import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Award } from '@prisma/client';
import { CreateAwardDto, UpdateAwardDto } from '../dto/award.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class AwardRepository {
  private readonly logger = new Logger(AwardRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Award>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.award.findMany({
        where: { resumeId },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.award.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Award | null> {
    return this.prisma.award.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateAwardDto): Promise<Award> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.award.create({
      data: {
        resumeId,
        title: data.title,
        issuer: data.issuer,
        date: new Date(data.date),
        description: data.description,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateAwardDto,
  ): Promise<Award | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.award.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.issuer && { issuer: data.issuer }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.award.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.award.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.award.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
