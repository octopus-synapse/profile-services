import type { Prisma } from '@prisma/client';
import type { ListSectionTypesQueryDto, SectionTypeListResponseDto } from '../../../dto';
import { AdminSectionTypesRepositoryPort } from '../../ports/admin-section-types.port';
import { toResponseDto } from '../../to-response-dto';

export class ListSectionTypesAdminUseCase {
  constructor(private readonly repository: AdminSectionTypesRepositoryPort) {}

  async execute(query: ListSectionTypesQueryDto): Promise<SectionTypeListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { search, isActive, semanticKind } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SectionTypeWhereInput = {};

    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (semanticKind) {
      where.semanticKind = semanticKind;
    }

    const [items, total] = await Promise.all([
      this.repository.findMany(where, skip, pageSize),
      this.repository.count(where),
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
