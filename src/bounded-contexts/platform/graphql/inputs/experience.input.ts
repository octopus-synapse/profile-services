import { Field, InputType, Int } from '@nestjs/graphql';
import {
  type CreateExperience,
  CreateExperienceSchema,
  type UpdateExperience,
  UpdateExperienceSchema,
} from '@/shared-kernel';

/**
 * GraphQL Input for creating experience
 *
 * Source of truth: CreateExperienceSchema (profile-contracts)
 * Validation: Handled by ZodValidationPipe at resolver level
 *
 * This class provides GraphQL schema generation while
 * Zod handles runtime validation.
 */
@InputType({ description: 'Input for creating work experience' })
export class CreateExperienceInput implements CreateExperience {
  @Field({ description: 'Company name' })
  company: string;

  @Field({ description: 'Job position/title' })
  position: string;

  @Field({ nullable: true, description: 'Work location' })
  location?: string;

  @Field({ description: 'Start date (YYYY-MM or YYYY-MM-DD)' })
  startDate: string;

  @Field({ nullable: true, description: 'End date (YYYY-MM or YYYY-MM-DD)' })
  endDate?: string;

  @Field({ description: 'Currently working here', defaultValue: false })
  current: boolean;

  @Field({ nullable: true, description: 'Job description' })
  description?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Key achievements in this role',
    defaultValue: [],
  })
  achievements?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Skills used in this role',
    defaultValue: [],
  })
  skills?: string[];

  @Field(() => Int, { nullable: true, description: 'Display order' })
  order?: number;
}

/**
 * UpdateExperience type is imported from profile-contracts
 * Schema is also imported - no local Zod schemas allowed
 */

/**
 * GraphQL Input for updating experience
 *
 * Source of truth: CreateExperienceSchema.partial() (profile-contracts)
 * All fields are optional for partial updates.
 */
@InputType({ description: 'Input for updating work experience' })
export class UpdateExperienceInput implements UpdateExperience {
  @Field({ nullable: true, description: 'Company name' })
  company?: string;

  @Field({ nullable: true, description: 'Job position/title' })
  position?: string;

  @Field({ nullable: true, description: 'Work location' })
  location?: string;

  @Field({ nullable: true, description: 'Start date (YYYY-MM or YYYY-MM-DD)' })
  startDate?: string;

  @Field({ nullable: true, description: 'End date (YYYY-MM or YYYY-MM-DD)' })
  endDate?: string;

  @Field({ nullable: true, description: 'Currently working here' })
  current?: boolean;

  @Field({ nullable: true, description: 'Job description' })
  description?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Key achievements in this role',
  })
  achievements?: string[];

  @Field(() => [String], {
    nullable: true,
    description: 'Skills used in this role',
  })
  skills?: string[];

  @Field(() => Int, { nullable: true, description: 'Display order' })
  order?: number;
}

/**
 * Re-export the Zod schema for use in validation pipes
 */
export { CreateExperienceSchema, UpdateExperienceSchema };
