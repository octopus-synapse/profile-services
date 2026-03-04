import { ApiProperty } from '@nestjs/swagger';

export class ShareAnalyticsSummaryDataDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  analytics!: Record<string, unknown>;
}

export class ShareAnalyticsEventsDataDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  events!: Array<Record<string, unknown>>;
}
