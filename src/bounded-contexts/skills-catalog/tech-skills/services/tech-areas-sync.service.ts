/**
 * Tech Areas Sync Service
 * Single Responsibility: Sync tech areas to database
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { TECH_AREAS } from '../data';

export class TechAreasSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
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
