import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { TechAreaRepositoryPort } from '../../../application/ports/tech-skills.port';
import type { TechArea } from '../../../dto/tech-area.dto';

export class TechAreaRepository extends TechAreaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAllActive(): Promise<TechArea[]> {
    const areas = await this.prisma.techArea.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        type: true,
        nameEn: true,
        namePtBr: true,
        descriptionEn: true,
        descriptionPtBr: true,
        icon: true,
        color: true,
        order: true,
      },
    });
    return areas as TechArea[];
  }
}
