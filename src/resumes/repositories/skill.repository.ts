import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Skill } from '@prisma/client';
import { CreateSkillDto, UpdateSkillDto } from '../dto/skill.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class SkillRepository {
  private readonly logger = new Logger(SkillRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 50,
    category?: string,
  ): Promise<PaginatedResult<Skill>> {
    const skip = (page - 1) * limit;
    const where = { resumeId, ...(category && { category }) };

    const [data, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.skill.count({ where }),
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

  async findOne(id: string, resumeId: string): Promise<Skill | null> {
    return this.prisma.skill.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateSkillDto): Promise<Skill> {
    const maxOrder = await this.getMaxOrder(resumeId, data.category);

    return this.prisma.skill.create({
      data: {
        resumeId,
        name: data.name,
        category: data.category,
        level: data.level,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async createMany(
    resumeId: string,
    skills: CreateSkillDto[],
  ): Promise<number> {
    const result = await this.prisma.skill.createMany({
      data: skills.map((skill, index) => ({
        resumeId,
        name: skill.name,
        category: skill.category,
        level: skill.level,
        order: skill.order ?? index,
      })),
    });
    return result.count;
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateSkillDto,
  ): Promise<Skill | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.skill.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.category && { category: data.category }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.skill.delete({ where: { id } });
    return true;
  }

  async deleteByCategory(resumeId: string, category: string): Promise<number> {
    const result = await this.prisma.skill.deleteMany({
      where: { resumeId, category },
    });
    return result.count;
  }

  async getCategories(resumeId: string): Promise<string[]> {
    const result = await this.prisma.skill.findMany({
      where: { resumeId },
      select: { category: true },
      distinct: ['category'],
    });
    return result.map((r) => r.category);
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.skill.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(
    resumeId: string,
    category: string,
  ): Promise<number> {
    const result = await this.prisma.skill.aggregate({
      where: { resumeId, category },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
