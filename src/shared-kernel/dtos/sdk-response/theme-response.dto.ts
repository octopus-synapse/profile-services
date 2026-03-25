/**
 * Theme SDK Response DTOs
 *
 * Response types for themes and theme approvals.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThemeResponseDto {
  @ApiProperty({ example: 'clxxx...' })
  id!: string;

  @ApiProperty({ example: 'Modern Dark' })
  name!: string;

  @ApiPropertyOptional({ example: 'A sleek dark theme' })
  description?: string;

  @ApiProperty({ example: false })
  isSystem!: boolean;

  @ApiProperty({ example: false })
  isPublic!: boolean;

  @ApiPropertyOptional({ example: {} })
  config?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: string;
}

export class SystemThemeResponseDto extends ThemeResponseDto {
  @ApiProperty({ example: true })
  isSystem!: boolean;

  @ApiPropertyOptional({ example: true })
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/preview.jpg' })
  previewUrl?: string;
}

export class ThemeApprovalResponseDto extends ThemeResponseDto {
  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
  })
  status!: string;

  @ApiPropertyOptional({ example: 'Needs improvement' })
  reviewNotes?: string;
}
