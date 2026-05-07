import type { z } from 'zod';
import type {
  PaginatedResumesDataDto,
  ResumeFullResponseDto,
  ResumeListItemDto,
  ResumeResponseDto,
} from '../dto/resumes.schema';
import type { ResumeResult, UserResumesPaginatedResult } from '../ports/resumes-service.port';
import type {
  MgmtResumeListItemSchema,
  MgmtResumeListResponseSchema,
} from '../resumes.routes.schemas';
import type { ResumeListItem } from '../services/resume-management/ports/resume-management.port';

export function toResumeResponseDto(resume: ResumeResult): ResumeResponseDto {
  return {
    id: resume.id,
    title: resume.title ?? '',
    language: resume.language ?? undefined,
    targetRole: resume.targetRole ?? undefined,
    isPublic: resume.isPublic ?? false,
    slug: resume.slug ?? undefined,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
  };
}

export function toResumeListItemDto(resume: ResumeResult): ResumeListItemDto {
  return toResumeResponseDto(resume);
}

export function toResumeFullResponseDto(resume: ResumeResult): ResumeFullResponseDto {
  const resumeSections: ResumeFullResponseDto['resumeSections'] = [];
  for (const section of resume.resumeSections ?? []) {
    const items: NonNullable<ResumeFullResponseDto['resumeSections']>[number]['items'] = [];
    for (const item of section.items) {
      items.push({ id: item.id, order: item.order, content: item.content ?? undefined });
    }
    resumeSections.push({
      id: section.id,
      order: section.order,
      visible: section.visible ?? true,
      sectionType: {
        id: section.sectionType.id,
        key: section.sectionType.key,
        semanticKind: section.sectionType.semanticKind ?? undefined,
        title: section.sectionType.title ?? undefined,
        version: section.sectionType.version ?? undefined,
      },
      items,
    });
  }
  return {
    ...toResumeResponseDto(resume),
    styleId: resume.styleId ?? undefined,
    style: resume.style
      ? {
          id: resume.style.id,
          name: resume.style.name,
          description: resume.style.description ?? undefined,
        }
      : undefined,
    resumeSections,
    fullName: resume.fullName ?? undefined,
    email: resume.email ?? undefined,
    phone: resume.phone ?? undefined,
    location: resume.location ?? undefined,
    summary: resume.summary ?? undefined,
  };
}

export function isPaginatedResult(
  result: ResumeResult[] | UserResumesPaginatedResult,
): result is UserResumesPaginatedResult {
  return 'resumes' in result && 'pagination' in result;
}

export function toPaginatedResumesData(
  result: ResumeResult[] | UserResumesPaginatedResult,
  fallback: { page: number; limit: number },
): PaginatedResumesDataDto {
  if (isPaginatedResult(result)) {
    const items: ResumeListItemDto[] = [];
    for (const r of result.resumes) items.push(toResumeListItemDto(r));
    const { total, page, limit, totalPages } = result.pagination;
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  const items: ResumeListItemDto[] = [];
  for (const r of result) items.push(toResumeListItemDto(r));
  return {
    items,
    total: result.length,
    page: fallback.page,
    limit: fallback.limit,
    totalPages: 1,
    hasNext: false,
    hasPrev: fallback.page > 1,
  };
}

type MgmtResumeListItemDto = z.infer<typeof MgmtResumeListItemSchema>;
type MgmtResumeListResponseDto = z.infer<typeof MgmtResumeListResponseSchema>;

/**
 * Strip a Resume row to the fields declared in `MgmtResumeListItemSchema`.
 * The Prisma query returns the full Resume model (legacy `include` shape);
 * this presenter is the contract boundary.
 */
export function toMgmtResumeListItemDto(resume: ResumeListItem): MgmtResumeListItemDto {
  return {
    id: resume.id,
    userId: resume.userId,
    title: resume.title,
    language: resume.language,
    isPublic: resume.isPublic,
    slug: resume.slug,
    fullName: resume.fullName,
    jobTitle: resume.jobTitle,
    summary: resume.summary,
    accentColor: resume.accentColor,
    styleId: resume.styleId,
    createdAt: resume.createdAt.toISOString(),
    updatedAt: resume.updatedAt.toISOString(),
    resumeSections: resume.resumeSections.map((s) => ({
      id: s.id,
      resumeId: s.resumeId,
      sectionTypeId: s.sectionTypeId,
      titleOverride: s.titleOverride,
      isVisible: s.isVisible,
      order: s.order,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      sectionType: {
        ...s.sectionType,
        createdAt: s.sectionType.createdAt.toISOString(),
        updatedAt: s.sectionType.updatedAt.toISOString(),
      },
      items: s.items.map((i) => ({
        id: i.id,
        resumeSectionId: i.resumeSectionId,
        content: i.content as Record<string, unknown> | null,
        isVisible: i.isVisible,
        order: i.order,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
    })) as MgmtResumeListItemDto['resumeSections'],
    _count: resume._count,
  };
}

export function toMgmtResumeListResponseDto(
  resumes: readonly ResumeListItem[],
): MgmtResumeListResponseDto {
  return { resumes: resumes.map(toMgmtResumeListItemDto) };
}
