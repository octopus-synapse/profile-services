import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * GraphQL ObjectType for Resume Experience
 *
 * Maps to the Experience Prisma entity with proper field resolvers.
 */
@ObjectType({ description: 'Professional work experience entry' })
export class ExperienceModel {
  @Field(() => ID, { description: 'Unique identifier' })
  id: string;

  @Field({ description: 'Resume ID this experience belongs to' })
  resumeId: string;

  @Field({ description: 'Company name' })
  company: string;

  @Field({ description: 'Job position/title' })
  position: string;

  @Field({ nullable: true, description: 'Work location' })
  location?: string;

  @Field({ description: 'Start date' })
  startDate: Date;

  @Field({ nullable: true, description: 'End date' })
  endDate?: Date;

  @Field({ description: 'Currently working here' })
  isCurrent: boolean;

  @Field({ nullable: true, description: 'Job description' })
  description?: string;

  @Field(() => [String], { description: 'Skills used in this role' })
  skills: string[];

  @Field(() => Int, { description: 'Display order' })
  order: number;

  @Field({ description: 'Created at timestamp' })
  createdAt: Date;

  @Field({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
