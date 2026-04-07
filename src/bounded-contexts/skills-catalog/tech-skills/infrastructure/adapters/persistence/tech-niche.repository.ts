import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { TechNiche } from '../../../dto/tech-niche.dto';
import type { TechAreaType } from '../../../interfaces';
import { TechNicheRepositoryPort } from '../../../application/ports/tech-skills.port';

export class TechNicheRepository extends TechNicheRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAllActive(): Promise<TechNiche[]> {
    const niches = await this.prisma.techNiche.findMany({
      where: { isActive: true },
      orderBy: [{ area: { order: 'asc' } }, { order: 'asc' }],
      include: {
        area: { select: { type: true } },
      },
    });

    return niches.map((n) => ({
      id: n.id,
      slug: n.slug,
      nameEn: n.nameEn,
      namePtBr: n.namePtBr,
      descriptionEn: n.descriptionEn,
      descriptionPtBr: n.descriptionPtBr,
      icon: n.icon,
      color: n.color,
      order: n.order,
      areaType: n.area.type as TechAreaType,
    }));
  }

  async findByAreaType(areaType: TechAreaType): Promise<TechNiche[]> {
    const niches = await this.prisma.techNiche.findMany({
      where: {
        isActive: true,
        area: { type: areaType },
      },
      orderBy: { order: 'asc' },
      include: {
        area: { select: { type: true } },
      },
    });

    return niches.map((n) => ({
      id: n.id,
      slug: n.slug,
      nameEn: n.nameEn,
      namePtBr: n.namePtBr,
      descriptionEn: n.descriptionEn,
      descriptionPtBr: n.descriptionPtBr,
      icon: n.icon,
      color: n.color,
      order: n.order,
      areaType: n.area.type as TechAreaType,
    }));
  }
}
