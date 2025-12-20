import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTalkDto {
  @ApiProperty({ example: 'Building Scalable APIs', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiProperty({ example: 'NodeConf 2023', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  event: string;

  @ApiProperty({
    example: 'conference',
    enum: ['conference', 'meetup', 'webinar', 'podcast', 'workshop'],
  })
  @IsString()
  @IsIn(['conference', 'meetup', 'webinar', 'podcast', 'workshop'])
  eventType: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ example: '2023-10-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: 'A deep dive into API design...',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://slides.com/user/talk' })
  @IsOptional()
  @IsUrl()
  slidesUrl?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=xxx' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ example: 500, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  attendees?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateTalkDto extends PartialType(CreateTalkDto) {}

export class TalkResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  event: string;

  @ApiProperty()
  eventType: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiProperty()
  date: Date;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  slidesUrl?: string;

  @ApiPropertyOptional()
  videoUrl?: string;

  @ApiPropertyOptional()
  attendees?: number;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
