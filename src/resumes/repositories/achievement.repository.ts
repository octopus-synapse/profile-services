import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Achievement } from '@prisma/client';
import {
  CreateAchievementDto,
  UpdateAchievementDto,
} from '../dto/achievement.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class AchievementRepository {
  private readonly logger = new Logger(AchievementRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Achievement>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.achievement.findMany({
        where: { resumeId },
        orderBy: { order: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.achievement.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Achievement | null> {
    return this.prisma.achievement.findFirst({
      where: { id, resumeId },
    });
  }

  async create(
    resumeId: string,
    data: CreateAchievementDto,
  ): Promise<Achievement> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.achievement.create({
      data: {
        resumeId,
        type: data.type,
        title: data.title,
        description: data.description,
        badgeUrl: data.badgeUrl,
        verificationUrl: data.verificationUrl,
        achievedAt: new Date(data.achievedAt),
        value: data.value,
        rank: data.rank,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateAchievementDto,
  ): Promise<Achievement | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.achievement.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.badgeUrl !== undefined && { badgeUrl: data.badgeUrl }),
        ...(data.verificationUrl !== undefined && {
          verificationUrl: data.verificationUrl,
        }),
        ...(data.achievedAt && { achievedAt: new Date(data.achievedAt) }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.rank !== undefined && { rank: data.rank }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.achievement.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.achievement.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.achievement.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
