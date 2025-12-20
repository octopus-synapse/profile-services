import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Publication } from '@prisma/client';
import {
  CreatePublicationDto,
  UpdatePublicationDto,
} from '../dto/publication.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class PublicationRepository {
  private readonly logger = new Logger(PublicationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Publication>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.publication.findMany({
        where: { resumeId },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.publication.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Publication | null> {
    return this.prisma.publication.findFirst({
      where: { id, resumeId },
    });
  }

  async create(
    resumeId: string,
    data: CreatePublicationDto,
  ): Promise<Publication> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.publication.create({
      data: {
        resumeId,
        title: data.title,
        publisher: data.publisher,
        publicationType: data.publicationType,
        url: data.url,
        publishedAt: new Date(data.publishedAt),
        abstract: data.abstract,
        coAuthors: data.coAuthors ?? [],
        citations: data.citations ?? 0,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdatePublicationDto,
  ): Promise<Publication | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.publication.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.publisher && { publisher: data.publisher }),
        ...(data.publicationType && { publicationType: data.publicationType }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.publishedAt && { publishedAt: new Date(data.publishedAt) }),
        ...(data.abstract !== undefined && { abstract: data.abstract }),
        ...(data.coAuthors && { coAuthors: data.coAuthors }),
        ...(data.citations !== undefined && { citations: data.citations }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.publication.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.publication.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.publication.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
