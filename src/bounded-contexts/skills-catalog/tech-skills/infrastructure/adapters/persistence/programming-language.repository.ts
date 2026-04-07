import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ProgrammingLanguage } from '../../../dto/programming-language.dto';
import { ProgrammingLanguageRepositoryPort } from '../../../application/ports/tech-skills.port';

export class ProgrammingLanguageRepository extends ProgrammingLanguageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAllActive(): Promise<ProgrammingLanguage[]> {
    return this.prisma.programmingLanguage.findMany({
      where: { isActive: true },
      orderBy: { popularity: 'desc' },
      select: {
        id: true,
        slug: true,
        nameEn: true,
        namePtBr: true,
        color: true,
        website: true,
        aliases: true,
        fileExtensions: true,
        paradigms: true,
        typing: true,
        popularity: true,
      },
    });
  }

  async search(query: string, limit: number): Promise<ProgrammingLanguage[]> {
    return this.prisma.$queryRaw<ProgrammingLanguage[]>`
      SELECT
        id, slug, "nameEn", "namePtBr", color, website,
        aliases, "fileExtensions", paradigms, typing, popularity
      FROM "ProgrammingLanguage"
      WHERE "isActive" = true
        AND (
          immutable_unaccent(lower("nameEn")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR immutable_unaccent(lower("namePtBr")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR slug LIKE '%' || ${query} || '%'
          OR ${query} = ANY(aliases)
        )
      ORDER BY popularity DESC
      LIMIT ${limit}
    `;
  }
}
