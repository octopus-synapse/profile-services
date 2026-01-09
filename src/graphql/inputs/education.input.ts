import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Input type for creating education
 */
@InputType({ description: 'Input for creating education entry' })
export class CreateEducationInput {
  @Field({ description: 'Institution name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  institution: string;

  @Field({ description: 'Degree obtained' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  degree: string;

  @Field({ description: 'Field of study' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  field: string;

  @Field({ nullable: true, description: 'Institution location' })
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

  @Field({ description: 'Currently studying' })
  @IsBoolean()
  isCurrent: boolean;

  @Field({ nullable: true, description: 'Program description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true, description: 'GPA or grade' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gpa?: string;

  @Field(() => Int, { nullable: true, description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/**
 * Input type for updating education
 */
@InputType({ description: 'Input for updating education entry' })
export class UpdateEducationInput {
  @Field({ nullable: true, description: 'Institution name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  institution?: string;

  @Field({ nullable: true, description: 'Degree obtained' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  degree?: string;

  @Field({ nullable: true, description: 'Field of study' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  field?: string;

  @Field({ nullable: true, description: 'Institution location' })
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

  @Field({ nullable: true, description: 'Currently studying' })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @Field({ nullable: true, description: 'Program description' })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true, description: 'GPA or grade' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gpa?: string;

  @Field(() => Int, { nullable: true, description: 'Display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
