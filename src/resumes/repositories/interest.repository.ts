import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Interest } from '@prisma/client';
import { CreateInterestDto, UpdateInterestDto } from '../dto/interest.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class InterestRepository {
  private readonly logger = new Logger(InterestRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Interest>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.interest.findMany({
        where: { resumeId },
        orderBy: { order: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.interest.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Interest | null> {
    return this.prisma.interest.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateInterestDto): Promise<Interest> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.interest.create({
      data: {
        resumeId,
        name: data.name,
        description: data.description,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateInterestDto,
  ): Promise<Interest | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.interest.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
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

    await this.prisma.interest.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.interest.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.interest.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
