import { type LayoutKind, Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { toPrismaJson } from '@/shared-kernel/persistence/json-column';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../../domain/ports/resume-style.repository.port';
import type {
  CreateStyleInput,
  StyleDetail,
  StyleScoreBreakdownData,
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
  styleScoreBreakdown: Prisma.JsonValue;
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

/**
 * Framework-free POJO. Wired by `resume-styles.composition.ts`.
 */
export class PrismaResumeStyleRepository extends ResumeStyleRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
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
    const totalPages = Math.ceil(total / limit);
    return {
      items: rows.map(toSummary),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findById(id: string): Promise<StyleDetail | null> {
    const row = await this.prisma.resumeStyle.findUnique({ where: { id } });
    return row ? toDetail(row) : null;
  }

  async create(
    input: CreateStyleInput & { styleScore: number; styleScoreBreakdown: StyleScoreBreakdownData },
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
        styleScoreBreakdown: toPrismaJson(input.styleScoreBreakdown),
        isSystem: false,
      },
    });
    return toDetail(row);
  }

  async update(
    id: string,
    patch: UpdateStylePatch & {
      styleScore?: number;
      styleScoreBreakdown?: StyleScoreBreakdownData;
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
    if (patch.styleScoreBreakdown !== undefined) {
      data.styleScoreBreakdown = toPrismaJson(patch.styleScoreBreakdown);
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

  async applyToResume(resumeId: string, styleId: string, userId: string): Promise<boolean> {
    // updateMany lets us scope the write by ownership in a single
    // round-trip. count === 0 means either the resume doesn't exist or
    // the caller isn't the owner — both 404 from the public API.
    const result = await this.prisma.resume.updateMany({
      where: { id: resumeId, userId },
      data: { styleId },
    });
    return result.count > 0;
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
  const breakdown = (row.styleScoreBreakdown ?? {}) as Partial<StyleScoreBreakdownData>;
  return {
    ...toSummary(row),
    version: row.version,
    styleConfig: (row.styleConfig ?? {}) as Record<string, unknown>,
    sectionStyles: (row.sectionStyles ?? {}) as Record<string, unknown>,
    styleScoreBreakdown: {
      buckets: breakdown.buckets ?? {},
      issues: breakdown.issues ?? [],
    },
    previewImages: row.previewImages,
    authorId: row.authorId,
  };
}
