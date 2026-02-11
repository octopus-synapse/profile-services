import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * GraphQL ObjectType for Resume Education
 *
 * Maps to the Education Prisma entity with proper field resolvers.
 */
@ObjectType({ description: 'Educational qualification entry' })
export class EducationModel {
  @Field(() => ID, { description: 'Unique identifier' })
  id: string;

  @Field({ description: 'Resume ID this education belongs to' })
  resumeId: string;

  @Field({ description: 'Institution name' })
  institution: string;

  @Field({ description: 'Degree obtained' })
  degree: string;

  @Field({ nullable: true, description: 'Field of study' })
  field?: string;

  @Field({ nullable: true, description: 'Institution location' })
  location?: string;

  @Field({ description: 'Start date' })
  startDate: Date;

  @Field({ nullable: true, description: 'End date' })
  endDate?: Date;

  @Field({ description: 'Currently studying' })
  isCurrent: boolean;

  @Field({ nullable: true, description: 'Program description' })
  description?: string;

  @Field({ nullable: true, description: 'GPA or grade' })
  gpa?: string;

  @Field(() => Int, { description: 'Display order' })
  order: number;

  @Field({ description: 'Created at timestamp' })
  createdAt: Date;

  @Field({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
