import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateHackathonDto {
  @ApiProperty({ example: 'ETHGlobal 2023', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Ethereum Foundation', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  organizer: string;

  @ApiPropertyOptional({ example: '1st Place', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiProperty({ example: 'DeFi Lending Protocol', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  projectName: string;

  @ApiPropertyOptional({
    example: 'Built a decentralized lending platform...',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: ['Solidity', 'React', 'Hardhat'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @ApiPropertyOptional({ example: 4, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  teamSize?: number;

  @ApiPropertyOptional({ example: 'https://demo.project.com' })
  @IsOptional()
  @IsUrl()
  demoUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/hackathon-project' })
  @IsOptional()
  @IsUrl()
  repoUrl?: string;

  @ApiProperty({ example: '2023-09-20' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '$10,000 USD + Mentorship', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  prize?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateHackathonDto extends PartialType(CreateHackathonDto) {}

export class HackathonResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resumeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  organizer: string;

  @ApiPropertyOptional()
  position?: string;

  @ApiProperty()
  projectName: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  technologies: string[];

  @ApiPropertyOptional()
  teamSize?: number;

  @ApiPropertyOptional()
  demoUrl?: string;

  @ApiPropertyOptional()
  repoUrl?: string;

  @ApiProperty()
  date: Date;

  @ApiPropertyOptional()
  prize?: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
