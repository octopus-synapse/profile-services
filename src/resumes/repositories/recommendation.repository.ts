import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Recommendation } from '@prisma/client';
import {
  CreateRecommendationDto,
  UpdateRecommendationDto,
} from '../dto/recommendation.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class RecommendationRepository {
  private readonly logger = new Logger(RecommendationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Recommendation>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where: { resumeId },
        orderBy: { order: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.recommendation.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Recommendation | null> {
    return this.prisma.recommendation.findFirst({
      where: { id, resumeId },
    });
  }

  async create(
    resumeId: string,
    data: CreateRecommendationDto,
  ): Promise<Recommendation> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.recommendation.create({
      data: {
        resumeId,
        author: data.author,
        position: data.position,
        company: data.company,
        content: data.content,
        date: data.date ? new Date(data.date) : null,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateRecommendationDto,
  ): Promise<Recommendation | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.recommendation.update({
      where: { id },
      data: {
        ...(data.author && { author: data.author }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.content && { content: data.content }),
        ...(data.date !== undefined && {
          date: data.date ? new Date(data.date) : null,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.recommendation.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.recommendation.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.recommendation.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
