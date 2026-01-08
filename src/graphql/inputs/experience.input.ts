import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Input type for creating a new experience
 */
@InputType({ description: 'Input for creating work experience' })
export class CreateExperienceInput {
  @Field({ description: 'Company name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company: string;

  @Field({ description: 'Job position/title' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  position: string;

  @Field({ nullable: true, description: 'Work location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @Field({ description: 'Start date (ISO 8601)' })
  @IsString()
  startDate: string;

  @Field({ nullable: true, description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @Field({ description: 'Currently working here' })
  @IsBoolean()
  isCurrent: boolean;

  @Field({ nullable: true, description: 'Job description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Skills used in this role',
    defaultValue: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @Field(() => Int, { nullable: true, description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/**
 * Input type for updating an experience
 */
@InputType({ description: 'Input for updating work experience' })
export class UpdateExperienceInput {
  @Field({ nullable: true, description: 'Company name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company?: string;

  @Field({ nullable: true, description: 'Job position/title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  position?: string;

  @Field({ nullable: true, description: 'Work location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @Field({ nullable: true, description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @Field({ nullable: true, description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @Field({ nullable: true, description: 'Currently working here' })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @Field({ nullable: true, description: 'Job description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Skills used in this role',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @Field(() => Int, { nullable: true, description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
