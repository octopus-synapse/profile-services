import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Talk } from '@prisma/client';
import { CreateTalkDto, UpdateTalkDto } from '../dto/talk.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class TalkRepository {
  private readonly logger = new Logger(TalkRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Talk>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.talk.findMany({
        where: { resumeId },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.talk.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Talk | null> {
    return this.prisma.talk.findFirst({
      where: { id, resumeId },
    });
  }

  async create(resumeId: string, data: CreateTalkDto): Promise<Talk> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.talk.create({
      data: {
        resumeId,
        title: data.title,
        event: data.event,
        eventType: data.eventType,
        location: data.location,
        date: new Date(data.date),
        description: data.description,
        slidesUrl: data.slidesUrl,
        videoUrl: data.videoUrl,
        attendees: data.attendees,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateTalkDto,
  ): Promise<Talk | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.talk.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.event && { event: data.event }),
        ...(data.eventType && { eventType: data.eventType }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.slidesUrl !== undefined && { slidesUrl: data.slidesUrl }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.attendees !== undefined && { attendees: data.attendees }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.talk.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.talk.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.talk.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
