/**
 * Analytics SDK Response DTOs
 *
 * Response types for tracking events, views, engagement, and statistics.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  eventId!: string;
}

export class ResumeViewsResponseDto {
  @ApiProperty({ example: 150 })
  total!: number;

  @ApiProperty({ example: 25 })
  unique!: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  lastViewedAt?: string;
}

export class ResumeViewsByPeriodDto {
  @ApiProperty({ example: '2024-01-01' })
  date!: string;

  @ApiProperty({ example: 10 })
  views!: number;
}

export class PopularSectionsResponseDto {
  @ApiProperty({ example: 'experience' })
  section!: string;

  @ApiProperty({ example: 45 })
  engagements!: number;

  @ApiProperty({ example: 120 })
  averageTimeSeconds!: number;
}

export class EngagementResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'clxxx...' })
  engagementId!: string;
}

export class EngagementMetricsResponseDto {
  @ApiProperty({ example: 120 })
  averageTimeOnPage!: number;

  @ApiProperty({ example: 0.65 })
  scrollDepth!: number;

  @ApiProperty({ example: 3.5 })
  clicksPerView!: number;
}

export class EventHistoryResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'PAGE_VIEW' })
  eventType!: string;

  @ApiProperty({ example: {} })
  metadata!: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class GeographicDistributionDto {
  @ApiProperty({ example: 'US' })
  country!: string;

  @ApiProperty({ example: 45 })
  count!: number;

  @ApiProperty({ example: 0.3 })
  percentage!: number;
}

export class DeviceStatsResponseDto {
  @ApiProperty({ example: 'desktop' })
  device!: string;

  @ApiProperty({ example: 65 })
  count!: number;

  @ApiProperty({ example: 0.65 })
  percentage!: number;
}
