import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePublicationDto {
  @ApiProperty({ example: 'Machine Learning in Production', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiProperty({ example: 'IEEE Conference on AI', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  publisher: string;

  @ApiProperty({
    example: 'paper',
    enum: ['paper', 'article', 'blog', 'whitepaper'],
  })
  @IsString()
  @IsIn(['paper', 'article', 'blog', 'whitepaper'])
  publicationType: string;

  @ApiPropertyOptional({ example: 'https://doi.org/10.1234/example' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ example: '2023-06-15' })
  @IsDateString()
  publishedAt: string;

  @ApiPropertyOptional({ example: 'This paper explores...', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  abstract?: string;

  @ApiPropertyOptional({ example: ['John Doe', 'Jane Smith'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coAuthors?: string[];

  @ApiPropertyOptional({ example: 42, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  citations?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdatePublicationDto extends PartialType(CreatePublicationDto) {}

export class PublicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  publisher: string;

  @ApiProperty()
  publicationType: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiProperty()
  publishedAt: Date;

  @ApiPropertyOptional()
  abstract?: string;

  @ApiProperty()
  coAuthors: string[];

  @ApiProperty()
  citations: number;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
