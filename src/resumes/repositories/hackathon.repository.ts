import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Hackathon } from '@prisma/client';
import { CreateHackathonDto, UpdateHackathonDto } from '../dto/hackathon.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class HackathonRepository {
  private readonly logger = new Logger(HackathonRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Hackathon>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.hackathon.findMany({
        where: { resumeId },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.hackathon.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Hackathon | null> {
    return this.prisma.hackathon.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateHackathonDto): Promise<Hackathon> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.hackathon.create({
      data: {
        resumeId,
        name: data.name,
        organizer: data.organizer,
        position: data.position,
        projectName: data.projectName,
        description: data.description,
        technologies: data.technologies ?? [],
        teamSize: data.teamSize,
        demoUrl: data.demoUrl,
        repoUrl: data.repoUrl,
        date: new Date(data.date),
        prize: data.prize,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateHackathonDto,
  ): Promise<Hackathon | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.hackathon.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.organizer && { organizer: data.organizer }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.projectName && { projectName: data.projectName }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.technologies && { technologies: data.technologies }),
        ...(data.teamSize !== undefined && { teamSize: data.teamSize }),
        ...(data.demoUrl !== undefined && { demoUrl: data.demoUrl }),
        ...(data.repoUrl !== undefined && { repoUrl: data.repoUrl }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.prize !== undefined && { prize: data.prize }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.hackathon.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.hackathon.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.hackathon.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
