import type { PaginatedStyles } from '../../domain/ports/resume-style.repository.port';
import type { StyleDetail, StyleSummary } from '../../domain/types';
import type {
  StyleDetailDto,
  StyleListResponseDto,
  StyleSummaryDto,
} from '../dto/resume-style.dto';

export function presentSummary(s: StyleSummary): StyleSummaryDto {
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

export function presentDetail(s: StyleDetail): StyleDetailDto {
  return {
    ...presentSummary(s),
    version: s.version,
    styleConfig: s.styleConfig as Record<string, unknown>,
    sectionStyles: s.sectionStyles as Record<string, unknown>,
    atsSafetyBreakdown: s.atsSafetyBreakdown as unknown as Record<string, number>,
    previewImages: [...s.previewImages],
    authorId: s.authorId,
  };
}

export function presentList(p: PaginatedStyles): StyleListResponseDto {
  return {
    items: p.items.map(presentSummary),
    total: p.total,
    page: p.page,
    limit: p.limit,
  };
}
