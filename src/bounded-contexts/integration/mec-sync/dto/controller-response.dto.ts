import { ApiProperty } from '@nestjs/swagger';
import type { Course, Institution, InstitutionWithCourses, MecStats } from '@/shared-kernel';
import type { SyncMetadata } from '../interfaces/mec-data.interface';

export class MecCourseListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  courses!: Course[];
}

export class MecCourseDataDto {
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  course!: Course | null;
}

export class MecInstitutionListDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  institutions!: Institution[];
}

export class MecInstitutionDataDto {
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  institution!: InstitutionWithCourses | null;
}

export class MecInstitutionCoursesDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  courses!: Course[];
}

export class MecStateCodesDataDto {
  @ApiProperty({ type: 'array', items: { type: 'string' } })
  states!: string[];
}

export class MecKnowledgeAreasDataDto {
  @ApiProperty({ type: 'array', items: { type: 'string' } })
  areas!: string[];
}

export class MecStatisticsDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  stats!: MecStats;
}

export class MecSyncExecutionDataDto {
  @ApiProperty({ example: 100 })
  institutionsInserted!: number;

  @ApiProperty({ example: 300 })
  coursesInserted!: number;

  @ApiProperty({ example: 400 })
  totalRowsProcessed!: number;

  @ApiProperty({ example: 0 })
  errorsCount!: number;
}

export class MecSyncStatusDataDto {
  @ApiProperty({ example: false })
  isRunning!: boolean;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  metadata!: SyncMetadata | null;

  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  lastSync!: Record<string, unknown> | null;
}

export class MecSyncHistoryDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  history!: Array<Record<string, unknown>>;
}
