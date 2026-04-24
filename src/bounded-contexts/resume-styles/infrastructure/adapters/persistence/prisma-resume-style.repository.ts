import { Injectable } from '@nestjs/common';
import { type LayoutKind, Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../../domain/ports/resume-style.repository.port';
import type {
  AtsSafetyBreakdown,
  CreateStyleInput,
  StyleDetail,
  StyleSummary,
  UpdateStylePatch,
} from '../../../domain/types';

type StyleRow = {
  id: string;
  name: string;
  description: string | null;
  authorId: string;
  version: number;
  styleScore: number;
  atsSafetyBreakdown: Prisma.JsonValue;
  layoutKind: LayoutKind;
  typstTemplate: string;
  styleConfig: Prisma.JsonValue;
  sectionStyles: Prisma.JsonValue;
  thumbnailUrl: string | null;
  previewImages: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaResumeStyleRepository extends ResumeStyleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(args: ListStylesArgs = {}): Promise<PaginatedStyles> {
    const page = Math.max(1, args.page ?? 1);
    const limit = Math.min(100, Math.max(1, args.limit ?? 20));
    const where: Prisma.ResumeStyleWhereInput = {};
    if (args.system !== undefined) where.isSystem = args.system;

    const [rows, total] = await Promise.all([
      this.prisma.resumeStyle.findMany({
        where,
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resumeStyle.count({ where }),
    ]);
    return { items: rows.map(toSummary), total, page, limit };
  }

  async findById(id: string): Promise<StyleDetail | null> {
    const row = await this.prisma.resumeStyle.findUnique({ where: { id } });
    return row ? toDetail(row) : null;
  }

  async create(
    input: CreateStyleInput & {
      styleScore: number;
      atsSafetyBreakdown: Record<string, number>;
    },
  ): Promise<StyleDetail> {
    const row = await this.prisma.resumeStyle.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        authorId: input.authorId,
        layoutKind: input.layoutKind,
        typstTemplate: input.typstTemplate,
        styleConfig: input.styleConfig as Prisma.InputJsonValue,
        sectionStyles: (input.sectionStyles ?? {}) as Prisma.InputJsonValue,
        styleScore: input.styleScore,
        atsSafetyBreakdown: input.atsSafetyBreakdown as Prisma.InputJsonValue,
        isSystem: false,
      },
    });
    return toDetail(row);
  }

  async update(
    id: string,
    patch: UpdateStylePatch & {
      styleScore?: number;
      atsSafetyBreakdown?: Record<string, number>;
    },
  ): Promise<StyleDetail> {
    const data: Prisma.ResumeStyleUpdateInput = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.typstTemplate !== undefined) data.typstTemplate = patch.typstTemplate;
    if (patch.layoutKind !== undefined) data.layoutKind = patch.layoutKind;
    if (patch.styleConfig !== undefined) {
      data.styleConfig = patch.styleConfig as Prisma.InputJsonValue;
    }
    if (patch.sectionStyles !== undefined) {
      data.sectionStyles = patch.sectionStyles as Prisma.InputJsonValue;
    }
    if (patch.styleScore !== undefined) data.styleScore = patch.styleScore;
    if (patch.atsSafetyBreakdown !== undefined) {
      data.atsSafetyBreakdown = patch.atsSafetyBreakdown as Prisma.InputJsonValue;
    }
    // Bump version on every admin update so the historyJson timeline
    // stays consistent with the row's mutation count.
    data.version = { increment: 1 };
    const row = await this.prisma.resumeStyle.update({ where: { id }, data });
    return toDetail(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.resumeStyle.delete({ where: { id } });
  }

  async applyToResume(resumeId: string, styleId: string): Promise<boolean> {
    try {
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { styleId },
        select: { id: true },
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        return false;
      }
      throw err;
    }
  }
}

function toSummary(row: StyleRow): StyleSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    styleScore: row.styleScore,
    layoutKind: row.layoutKind,
    typstTemplate: row.typstTemplate,
    isSystem: row.isSystem,
    thumbnailUrl: row.thumbnailUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDetail(row: StyleRow): StyleDetail {
  return {
    ...toSummary(row),
    version: row.version,
    styleConfig: (row.styleConfig ?? {}) as Record<string, unknown>,
    sectionStyles: (row.sectionStyles ?? {}) as Record<string, unknown>,
    atsSafetyBreakdown: (row.atsSafetyBreakdown ?? {}) as AtsSafetyBreakdown,
    previewImages: row.previewImages,
    authorId: row.authorId,
  };
}
