import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Experience } from '@prisma/client';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from '../dto/experience.dto';
import { PaginatedResult } from '../dto/pagination.dto';
import { PAGINATION } from '../../common/constants/validation/pagination.const';

@Injectable()
export class ExperienceRepository {
  private readonly logger = new Logger(ExperienceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<Experience>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.experience.findMany({
        where: { resumeId },
        orderBy: { order: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.experience.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Experience | null> {
    return this.prisma.experience.findFirst({
      where: { id, resumeId },
    });
  }

  async create(
    resumeId: string,
    data: CreateExperienceDto,
  ): Promise<Experience> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.experience.create({
      data: {
        resumeId,
        company: data.company,
        position: data.position,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent ?? false,
        location: data.location,
        description: data.description,
        skills: data.skills ?? [],
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateExperienceDto,
  ): Promise<Experience | null> {
    // Use updateMany to avoid N+1 query and handle non-existent records
    const updateData = {
      ...(data.company && { company: data.company }),
      ...(data.position && { position: data.position }),
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
      ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.skills && { skills: data.skills }),
      ...(data.order !== undefined && { order: data.order }),
    };

    const result = await this.prisma.experience.updateMany({
      where: { id, resumeId },
      data: updateData,
    });

    if (result.count === 0) return null;

    // Fetch and return the updated record
    return this.prisma.experience.findUnique({ where: { id } });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    // Use deleteMany to avoid N+1 query - single query handles both check and delete
    const result = await this.prisma.experience.deleteMany({
      where: { id, resumeId },
    });
    return result.count > 0;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.experience.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.experience.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
