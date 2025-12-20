import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateOpenSourceDto {
  @ApiProperty({ example: 'React', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  projectName: string;

  @ApiProperty({ example: 'https://github.com/facebook/react' })
  @IsUrl()
  projectUrl: string;

  @ApiProperty({
    example: 'contributor',
    enum: ['maintainer', 'core_contributor', 'contributor'],
  })
  @IsString()
  @IsIn(['maintainer', 'core_contributor', 'contributor'])
  role: string;

  @ApiPropertyOptional({
    example: 'Contributed to the hooks system...',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: ['TypeScript', 'JavaScript', 'React'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional({ example: 150, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  commits?: number;

  @ApiPropertyOptional({ example: 25, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  prsCreated?: number;

  @ApiPropertyOptional({ example: 20, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  prsMerged?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  issuesClosed?: number;

  @ApiPropertyOptional({ example: 50000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stars?: number;

  @ApiProperty({ example: '2020-01-15' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2023-06-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateOpenSourceDto extends PartialType(CreateOpenSourceDto) {}

export class OpenSourceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  projectUrl: string;

  @ApiProperty()
  role: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  technologies: string[];

  @ApiProperty()
  commits: number;

  @ApiProperty()
  prsCreated: number;

  @ApiProperty()
  prsMerged: number;

  @ApiProperty()
  issuesClosed: number;

  @ApiProperty()
  stars: number;

  @ApiProperty()
  startDate: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
