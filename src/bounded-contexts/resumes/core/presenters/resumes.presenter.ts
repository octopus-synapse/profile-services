import type {
  PaginatedResumesDataDto,
  ResumeFullResponseDto,
  ResumeListItemDto,
  ResumeResponseDto,
} from '../dto/resumes.dto';
import type { ResumeResult, UserResumesPaginatedResult } from '../ports/resumes-service.port';

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
    activeThemeId: resume.activeThemeId ?? undefined,
    activeTheme: resume.activeTheme
      ? {
          id: resume.activeTheme.id,
          name: resume.activeTheme.name,
          description: resume.activeTheme.description ?? undefined,
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
    const data: ResumeListItemDto[] = [];
    for (const r of result.resumes) data.push(toResumeListItemDto(r));
    return {
      data,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    };
  }

  const data: ResumeListItemDto[] = [];
  for (const r of result) data.push(toResumeListItemDto(r));
  return {
    data,
    meta: {
      total: result.length,
      page: fallback.page,
      limit: fallback.limit,
      totalPages: 1,
    },
  };
}
