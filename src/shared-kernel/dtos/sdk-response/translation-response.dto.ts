/**
 * Translation SDK Response DTOs
 *
 * Response types for text translation operations.
 */

import { ApiProperty } from '@nestjs/swagger';

export class TranslationResponseDto {
  @ApiProperty({ example: 'Translated text here' })
  text!: string;

  @ApiProperty({ example: 'en' })
  sourceLanguage!: string;

  @ApiProperty({ example: 'pt' })
  targetLanguage!: string;
}

export class BatchTranslationResponseDto {
  @ApiProperty({ type: [TranslationResponseDto] })
  translations!: TranslationResponseDto[];

  @ApiProperty({ example: 5 })
  count!: number;
}
