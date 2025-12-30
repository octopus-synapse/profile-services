/**
 * Tech Niches Sync Service
 * Single Responsibility: Sync tech niches to database
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TECH_NICHES } from '../data';

@Injectable()
export class TechNichesSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async syncNiches(): Promise<number> {
    let count = 0;

    for (const niche of TECH_NICHES) {
      const area = await this.prisma.techArea.findUnique({
        where: { type: niche.areaType },
      });

      if (!area) {
        this.logger.warn(
          `Area not found for niche ${niche.slug}: ${niche.areaType}`,
        );
        continue;
      }

      await this.prisma.techNiche.upsert({
        where: { slug: niche.slug },
        create: {
          slug: niche.slug,
          nameEn: niche.nameEn,
          namePtBr: niche.namePtBr,
          descriptionEn: niche.descriptionEn,
          descriptionPtBr: niche.descriptionPtBr,
          icon: niche.icon,
          color: niche.color,
          order: niche.order,
          areaId: area.id,
        },
        update: {
          nameEn: niche.nameEn,
          namePtBr: niche.namePtBr,
          descriptionEn: niche.descriptionEn,
          descriptionPtBr: niche.descriptionPtBr,
          icon: niche.icon,
          color: niche.color,
          order: niche.order,
          areaId: area.id,
        },
      });
      count++;
    }

    return count;
  }
}
