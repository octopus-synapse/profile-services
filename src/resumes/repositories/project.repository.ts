import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Project } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class ProjectRepository {
  private readonly logger = new Logger(ProjectRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Project>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where: { resumeId },
        orderBy: { order: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateProjectDto): Promise<Project> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.project.create({
      data: {
        resumeId,
        name: data.name,
        description: data.description,
        url: data.url,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent ?? false,
        technologies: data.technologies ?? [],
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateProjectDto,
  ): Promise<Project | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
        ...(data.technologies && { technologies: data.technologies }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.project.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.project.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.project.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
