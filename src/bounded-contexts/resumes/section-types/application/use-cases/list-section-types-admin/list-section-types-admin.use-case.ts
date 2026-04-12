import type { ListSectionTypesQueryDto, SectionTypeListResponseDto } from '../../../dto';
import type { SectionTypeFilter } from '../../ports/admin-section-types.port';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';
import { toResponseDto } from '../../to-response-dto';

export class ListSectionTypesAdminUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(query: ListSectionTypesQueryDto): Promise<SectionTypeListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { search, isActive, semanticKind } = query;
    const skip = (page - 1) * pageSize;

    const filter: SectionTypeFilter = {};

    if (search) filter.search = search;
    if (isActive !== undefined) filter.isActive = isActive;
    if (semanticKind) filter.semanticKind = semanticKind;

    const [items, total] = await Promise.all([
      this.repository.findMany(filter, skip, pageSize),
      this.repository.count(filter),
    ]);

    return {
      items: items.map(toResponseDto),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
