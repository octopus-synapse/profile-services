/**
 * Tech Niches Sync Service
 * Single Responsibility: Sync tech niches to database
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TechSkillsRepository } from '../repositories';
import { TECH_NICHES } from '../data';

@Injectable()
export class TechNichesSyncService {
  constructor(
    private readonly techSkillsRepo: TechSkillsRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async syncNiches(): Promise<number> {
    let count = 0;

    for (const niche of TECH_NICHES) {
      const area = await this.techSkillsRepo.findAreaByType(niche.areaType);

      if (!area) {
        this.logger.warn(
          `Area not found for niche ${niche.slug}: ${niche.areaType}`,
        );
        continue;
      }

      await this.techSkillsRepo.upsertNiche({
        slug: niche.slug,
        nameEn: niche.nameEn,
        namePtBr: niche.namePtBr,
        descriptionEn: niche.descriptionEn,
        descriptionPtBr: niche.descriptionPtBr,
        icon: niche.icon,
        color: niche.color,
        order: niche.order,
        areaId: area.id,
      });
      count++;
    }

    return count;
  }
}
