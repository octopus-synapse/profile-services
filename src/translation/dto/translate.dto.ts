/**
 * Translation DTOs
 * Data transfer objects for translation endpoints
 */

import {
  IsString,
  IsArray,
  IsEnum,
  IsNotEmpty,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SupportedLanguage {
  PT = 'pt',
  EN = 'en',
}

export class TranslateTextDto {
  @ApiProperty({
    description: 'Text to translate',
    example: 'Desenvolvedor de software com 5 anos de experiência',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Source language',
    enum: SupportedLanguage,
    example: 'pt',
  })
  @IsEnum(SupportedLanguage)
  sourceLanguage: SupportedLanguage;

  @ApiProperty({
    description: 'Target language',
    enum: SupportedLanguage,
    example: 'en',
  })
  @IsEnum(SupportedLanguage)
  targetLanguage: SupportedLanguage;
}

export class TranslateBatchDto {
  @ApiProperty({
    description: 'Array of texts to translate',
    example: ['Desenvolvedor', 'Engenheiro de Software'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  texts: string[];

  @ApiProperty({
    description: 'Source language',
    enum: SupportedLanguage,
    example: 'pt',
  })
  @IsEnum(SupportedLanguage)
  sourceLanguage: SupportedLanguage;

  @ApiProperty({
    description: 'Target language',
    enum: SupportedLanguage,
    example: 'en',
  })
  @IsEnum(SupportedLanguage)
  targetLanguage: SupportedLanguage;
}
