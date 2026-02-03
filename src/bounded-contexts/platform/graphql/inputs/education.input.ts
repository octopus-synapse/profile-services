import { InputType, Field, Int } from '@nestjs/graphql';
import {
  CreateEducationSchema,
  UpdateEducationSchema,
  type CreateEducation,
  type UpdateEducation,
} from '@octopus-synapse/profile-contracts';

/**
 * GraphQL Input for creating education
 *
 * Source of truth: CreateEducationSchema (profile-contracts)
 * Validation: Handled by ZodValidationPipe at resolver level
 *
 * This class provides GraphQL schema generation while
 * Zod handles runtime validation.
 */
@InputType({ description: 'Input for creating education entry' })
export class CreateEducationInput implements CreateEducation {
  @Field({ description: 'Institution name' })
  institution: string;

  @Field({ description: 'Degree obtained' })
  degree: string;

  @Field({ nullable: true, description: 'Field of study' })
  field?: string;

  @Field({ nullable: true, description: 'Institution location' })
  location?: string;

  @Field({ description: 'Start date (YYYY-MM or YYYY-MM-DD)' })
  startDate: string;

  @Field({ nullable: true, description: 'End date (YYYY-MM or YYYY-MM-DD)' })
  endDate?: string;

  @Field({ description: 'Currently studying', defaultValue: false })
  current: boolean;

  @Field({ nullable: true, description: 'Program description' })
  description?: string;

  @Field({ nullable: true, description: 'GPA or grade' })
  gpa?: string;

  @Field(() => Int, { nullable: true, description: 'Display order' })
  order?: number;
}

/**
 * UpdateEducation type is imported from profile-contracts
 * Schema is also imported - no local Zod schemas allowed
 */

/**
 * GraphQL Input for updating education
 *
 * Source of truth: CreateEducationSchema.partial() (profile-contracts)
 * All fields are optional for partial updates.
 */
@InputType({ description: 'Input for updating education entry' })
export class UpdateEducationInput implements UpdateEducation {
  @Field({ nullable: true, description: 'Institution name' })
  institution?: string;

  @Field({ nullable: true, description: 'Degree obtained' })
  degree?: string;

  @Field({ nullable: true, description: 'Field of study' })
  field?: string;

  @Field({ nullable: true, description: 'Institution location' })
  location?: string;

  @Field({ nullable: true, description: 'Start date (YYYY-MM or YYYY-MM-DD)' })
  startDate?: string;

  @Field({ nullable: true, description: 'End date (YYYY-MM or YYYY-MM-DD)' })
  endDate?: string;

  @Field({ nullable: true, description: 'Currently studying' })
  current?: boolean;

  @Field({ nullable: true, description: 'Program description' })
  description?: string;

  @Field({ nullable: true, description: 'GPA or grade' })
  gpa?: string;

  @Field(() => Int, { nullable: true, description: 'Display order' })
  order?: number;
}

/**
 * Re-export the Zod schema for use in validation pipes
 */
export { CreateEducationSchema, UpdateEducationSchema };
