/**
 * MEC SDK Response DTOs
 *
 * Response types for Brazilian MEC institutions, courses, and sync status.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MecInstitutionDto {
  @ApiProperty({ example: 12345 })
  id!: number;

  @ApiProperty({ example: 'Universidade Federal de São Paulo' })
  name!: string;

  @ApiPropertyOptional({ example: 'UNIFESP' })
  acronym?: string;

  @ApiPropertyOptional({ example: 'SP' })
  stateCode?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  city?: string;

  @ApiProperty({ example: 5 })
  iguGeral!: number;
}

export class MecCourseDto {
  @ApiProperty({ example: 67890 })
  id!: number;

  @ApiProperty({ example: 'Ciência da Computação' })
  name!: string;

  @ApiPropertyOptional({ example: 'Bacharelado' })
  degree?: string;

  @ApiPropertyOptional({ example: 'Presencial' })
  modality?: string;

  @ApiProperty({ example: 12345 })
  institutionId!: number;

  @ApiPropertyOptional({ example: 4 })
  cpc?: number;

  @ApiPropertyOptional({ example: 5 })
  enade?: number;
}

export class StateCodeResponseDto {
  @ApiProperty({ example: 'SP' })
  code!: string;

  @ApiProperty({ example: 'São Paulo' })
  name!: string;
}

export class KnowledgeAreaResponseDto {
  @ApiProperty({ example: 'ENGENHARIA' })
  code!: string;

  @ApiProperty({ example: 'Engenharia e Tecnologia' })
  name!: string;
}

export class MecStatisticsResponseDto {
  @ApiProperty({ example: 2500 })
  totalInstitutions!: number;

  @ApiProperty({ example: 45000 })
  totalCourses!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  lastSyncAt!: string;
}

export class MecSyncStatusResponseDto {
  @ApiProperty({
    example: 'RUNNING',
    enum: ['IDLE', 'RUNNING', 'COMPLETED', 'FAILED'],
  })
  status!: string;

  @ApiPropertyOptional({ example: 75 })
  progress?: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  startedAt?: string;

  @ApiPropertyOptional({ example: 'Syncing institutions...' })
  currentTask?: string;
}

export class MecSyncHistoryResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'COMPLETED', enum: ['COMPLETED', 'FAILED'] })
  status!: string;

  @ApiProperty({ example: 2500 })
  recordsProcessed!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  startedAt!: string;

  @ApiProperty({ example: '2024-01-01T01:30:00.000Z' })
  completedAt!: string;
}
