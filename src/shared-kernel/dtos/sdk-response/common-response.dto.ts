/**
 * Common SDK Response DTOs
 *
 * Generic response types shared across multiple domains.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 'Resource deleted successfully' })
  message?: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  timestamp?: string;
}
