import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Education } from '@prisma/client';
import { CreateEducationDto, UpdateEducationDto } from '../dto/education.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class EducationRepository {
  private readonly logger = new Logger(EducationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Education>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.education.findMany({
        where: { resumeId },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.education.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Education | null> {
    return this.prisma.education.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateEducationDto): Promise<Education> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.education.create({
      data: {
        resumeId,
        institution: data.institution,
        degree: data.degree,
        field: data.field,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isCurrent: data.isCurrent ?? false,
        location: data.location,
        description: data.description,
        gpa: data.gpa,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateEducationDto,
  ): Promise<Education | null> {
    const updateData = {
      ...(data.institution && { institution: data.institution }),
      ...(data.degree && { degree: data.degree }),
      ...(data.field && { field: data.field }),
      ...(data.startDate && { startDate: new Date(data.startDate) }),
      ...(data.endDate !== undefined && {
        endDate: data.endDate ? new Date(data.endDate) : null,
      }),
      ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.gpa !== undefined && { gpa: data.gpa }),
      ...(data.order !== undefined && { order: data.order }),
    };

    const result = await this.prisma.education.updateMany({
      where: { id, resumeId },
      data: updateData,
    });

    if (result.count === 0) return null;

    return this.prisma.education.findUnique({ where: { id } });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const result = await this.prisma.education.deleteMany({
      where: { id, resumeId },
    });
    return result.count > 0;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.education.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.education.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
