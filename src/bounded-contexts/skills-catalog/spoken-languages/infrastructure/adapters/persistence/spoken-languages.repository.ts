import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type SpokenLanguage,
  SpokenLanguagesRepositoryPort,
} from '../../../application/ports/spoken-languages.port';

export class SpokenLanguagesRepository extends SpokenLanguagesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAllActive(): Promise<SpokenLanguage[]> {
    return this.prisma.spokenLanguage.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        code: true,
        nameEn: true,
        namePtBr: true,
        nameEs: true,
        nativeName: true,
      },
    });
  }

  async searchByName(query: string, limit: number): Promise<SpokenLanguage[]> {
    return this.prisma.spokenLanguage.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: query, mode: 'insensitive' } },
          { namePtBr: { contains: query, mode: 'insensitive' } },
          { nameEs: { contains: query, mode: 'insensitive' } },
          { nativeName: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { order: 'asc' },
      take: limit,
      select: {
        code: true,
        nameEn: true,
        namePtBr: true,
        nameEs: true,
        nativeName: true,
      },
    });
  }

  async findByCode(code: string): Promise<SpokenLanguage | null> {
    return this.prisma.spokenLanguage.findUnique({
      where: { code },
      select: {
        code: true,
        nameEn: true,
        namePtBr: true,
        nameEs: true,
        nativeName: true,
      },
    });
  }
}
