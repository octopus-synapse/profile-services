/**
 * Template Selection DTO
 * DTO for template and color selection step
 */

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TemplateSelectionDto {
  @ApiProperty({
    example: 'professional',
    enum: ['professional', 'creative', 'minimal', 'modern'],
  })
  @IsString()
  template: string;

  @ApiProperty({
    example: 'ocean',
    enum: ['ocean', 'sunset', 'forest', 'lavender', 'rose', 'monochrome'],
  })
  @IsString()
  palette: string;
}
