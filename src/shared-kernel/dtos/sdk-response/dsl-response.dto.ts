/**
 * DSL SDK Response DTOs
 *
 * Response types for DSL rendering, parsing, validation, and suggestions.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DslRenderResponseDto {
  @ApiProperty({ example: '<div class="resume">...</div>' })
  html!: string;

  @ApiPropertyOptional({ example: '.resume { ... }' })
  css?: string;
}

export class DslParseResponseDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiPropertyOptional({ example: {} })
  ast?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String], example: ['Syntax error at line 5'] })
  errors?: string[];
}

export class DslValidationResponseDto {
  @ApiProperty({ example: true })
  valid!: boolean;

  @ApiPropertyOptional({ type: [String], example: ['Unknown directive @foo'] })
  errors?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Deprecated syntax'] })
  warnings?: string[];
}

export class DslSuggestionResponseDto {
  @ApiProperty({ example: '@section' })
  text!: string;

  @ApiPropertyOptional({ example: 'Create a new section' })
  description?: string;

  @ApiPropertyOptional({ example: 'directive' })
  type?: string;
}
