import { Injectable, Logger } from '@nestjs/common';
import { Award } from '@prisma/client';
import type { SectionType } from '@/bounded-contexts/resumes/domain/events';
import type { CreateAward, UpdateAward } from '@/shared-kernel';
import { BaseSubResourceService } from './base';

@Injectable()
export class AwardService extends BaseSubResourceService<Award, CreateAward, UpdateAward> {
  protected readonly entityName = 'Award';
  protected readonly sectionType: SectionType = 'awards';
  protected readonly logger = new Logger(AwardService.name);
}
