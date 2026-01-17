/**
 * Tech Areas Sync Service
 * Single Responsibility: Sync tech areas to database
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TechSkillsRepository } from '../repositories';
import { TECH_AREAS } from '../data';

@Injectable()
export class TechAreasSyncService {
  constructor(
    private readonly techSkillsRepo: TechSkillsRepository,
    private readonly logger: AppLoggerService,
  ) {}

  async syncAreas(): Promise<number> {
    let count = 0;

    for (const area of TECH_AREAS) {
      await this.techSkillsRepo.upsertArea(area);
      count++;
    }

    return count;
  }
}
