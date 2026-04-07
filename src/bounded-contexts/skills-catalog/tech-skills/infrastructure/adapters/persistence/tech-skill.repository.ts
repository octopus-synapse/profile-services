import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { TechSkill, TechSkillRawQueryResult } from '../../../dto/tech-skill.dto';
import type { SkillType } from '../../../interfaces';
import { mapRawSkillsTo, mapSkillsTo } from '../../../utils';
import { TechSkillRepositoryPort } from '../../../application/ports/tech-skills.port';

const NICHE_SELECT = { slug: true, nameEn: true, namePtBr: true } as const;

export class TechSkillRepository extends TechSkillRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAllActive(): Promise<TechSkill[]> {
    const skills = await this.prisma.techSkill.findMany({
      where: { isActive: true },
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });
    return mapSkillsTo(skills);
  }

  async findByNiche(nicheSlug: string): Promise<TechSkill[]> {
    const skills = await this.prisma.techSkill.findMany({
      where: { isActive: true, niche: { slug: nicheSlug } },
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });
    return mapSkillsTo(skills);
  }

  async findByType(type: SkillType, limit: number): Promise<TechSkill[]> {
    const skills = await this.prisma.techSkill.findMany({
      where: { isActive: true, type },
      take: limit,
      orderBy: { popularity: 'desc' },
      include: { niche: { select: NICHE_SELECT } },
    });
    return mapSkillsTo(skills);
  }

  async searchSkills(query: string, limit: number): Promise<TechSkill[]> {
    const skills = await this.prisma.$queryRaw<TechSkillRawQueryResult[]>`
      SELECT
        s.id, s.slug, s."nameEn", s."namePtBr", s.type,
        s.icon, s.color, s.website, s.aliases, s.popularity,
        n.slug as niche_slug,
        n."nameEn" as "niche_nameEn",
        n."namePtBr" as "niche_namePtBr"
      FROM "TechSkill" s
      LEFT JOIN "TechNiche" n ON s."nicheId" = n.id
      WHERE s."isActive" = true
        AND (
          immutable_unaccent(lower(s."nameEn")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR immutable_unaccent(lower(s."namePtBr")) LIKE '%' || immutable_unaccent(lower(${query})) || '%'
          OR s.slug LIKE '%' || ${query} || '%'
          OR ${query} = ANY(s.aliases)
          OR ${query} = ANY(s.keywords)
        )
      ORDER BY s.popularity DESC
      LIMIT ${limit}
    `;
    return mapRawSkillsTo(skills);
  }
}
