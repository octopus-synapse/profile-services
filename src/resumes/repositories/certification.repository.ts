import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Certification } from '@prisma/client';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
} from '../dto/certification.dto';
import { PaginatedResult } from '../dto/pagination.dto';

@Injectable()
export class CertificationRepository {
  private readonly logger = new Logger(CertificationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    resumeId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Certification>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.certification.findMany({
        where: { resumeId },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.certification.count({ where: { resumeId } }),
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

  async findOne(id: string, resumeId: string): Promise<Certification | null> {
    return this.prisma.certification.findFirst({
      where: { id, resumeId },
    });
  }

  async create(
    resumeId: string,
    data: CreateCertificationDto,
  ): Promise<Certification> {
    const maxOrder = await this.getMaxOrder(resumeId);

    return this.prisma.certification.create({
      data: {
        resumeId,
        name: data.name,
        issuer: data.issuer,
        issueDate: new Date(data.issueDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        credentialId: data.credentialId,
        credentialUrl: data.credentialUrl,
        order: data.order ?? maxOrder + 1,
      },
    });
  }

  async update(
    id: string,
    resumeId: string,
    data: UpdateCertificationDto,
  ): Promise<Certification | null> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return null;

    return this.prisma.certification.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.issuer && { issuer: data.issuer }),
        ...(data.issueDate && { issueDate: new Date(data.issueDate) }),
        ...(data.expiryDate !== undefined && {
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        }),
        ...(data.credentialId !== undefined && {
          credentialId: data.credentialId,
        }),
        ...(data.credentialUrl !== undefined && {
          credentialUrl: data.credentialUrl,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, resumeId: string): Promise<boolean> {
    const exists = await this.findOne(id, resumeId);
    if (!exists) return false;

    await this.prisma.certification.delete({ where: { id } });
    return true;
  }

  async reorder(resumeId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.certification.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  private async getMaxOrder(resumeId: string): Promise<number> {
    const result = await this.prisma.certification.aggregate({
      where: { resumeId },
      _max: { order: true },
    });
    return result._max.order ?? -1;
  }
}
