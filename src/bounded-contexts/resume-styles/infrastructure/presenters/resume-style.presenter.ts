import { buildPaginatedResponse } from '@/shared-kernel/schemas/common/build-paginated-response';
import type { PaginatedStyles } from '../../domain/ports/resume-style.repository.port';
import type { StyleDetail, StyleSummary } from '../../domain/types';
import type {
  StyleDetailDto,
  StyleListResponseDto,
  StyleSummaryDto,
} from '../dto/resume-style.schema';

export function toSummaryResponseDto(s: StyleSummary): StyleSummaryDto {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    styleScore: s.styleScore,
    layoutKind: s.layoutKind,
    typstTemplate: s.typstTemplate,
    isSystem: s.isSystem,
    thumbnailUrl: s.thumbnailUrl,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

/**
 * P2-095 — narrow JsonValue → typed object via a single helper so
 * the presenter doesn't litter double-cast assertions. The runtime
 * trusts the seeded shape (validated at write time by Zod schemas
 * in the admin routes); the helper just makes the assumption
 * explicit and gives tests one knob to flip.
 */
function asJsonObject<T extends Record<string, unknown>>(value: unknown): T {
  return (value ?? {}) as T;
}

export function toDetailResponseDto(s: StyleDetail): StyleDetailDto {
  return {
    ...toSummaryResponseDto(s),
    version: s.version,
    styleConfig: asJsonObject(s.styleConfig),
    sectionStyles: asJsonObject(s.sectionStyles),
    styleScoreBreakdown: {
      buckets: { ...s.styleScoreBreakdown.buckets },
      issues: s.styleScoreBreakdown.issues.map((i) => ({
        code: i.code,
        severity: i.severity,
        bucket: i.bucket,
        ...(i.messageArgs ? { messageArgs: i.messageArgs } : {}),
      })),
    },
    previewImages: [...s.previewImages],
    authorId: s.authorId,
  };
}

export function toListResponseDto(p: PaginatedStyles): StyleListResponseDto {
  return buildPaginatedResponse(p.items.map(toSummaryResponseDto), p.total, {
    page: p.page,
    limit: p.limit,
  });
}
