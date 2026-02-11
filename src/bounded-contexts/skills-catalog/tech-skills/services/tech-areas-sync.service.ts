/**
 * Tech Areas Sync Service
 * Single Responsibility: Sync tech areas to database
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { TECH_AREAS } from '../data';

@Injectable()
export class TechAreasSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async syncAreas(): Promise<number> {
    let count = 0;

    for (const area of TECH_AREAS) {
      await this.prisma.techArea.upsert({
        where: { type: area.type },
        create: area,
        update: {
          nameEn: area.nameEn,
          namePtBr: area.namePtBr,
          descriptionEn: area.descriptionEn,
          descriptionPtBr: area.descriptionPtBr,
          icon: area.icon,
          color: area.color,
          order: area.order,
        },
      });
      count++;
    }

    return count;
  }
}
