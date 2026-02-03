import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

/**
 * GraphQL ObjectType for Resume Skill
 */
@ObjectType({ description: 'Technical or professional skill' })
export class SkillModel {
  @Field(() => ID, { description: 'Unique identifier' })
  id: string;

  @Field({ description: 'Resume ID this skill belongs to' })
  resumeId: string;

  @Field({ description: 'Skill name' })
  name: string;

  @Field(() => Int, { nullable: true, description: 'Proficiency level (0-5)' })
  level?: number;

  @Field({ description: 'Skill category' })
  category: string;

  @Field(() => Int, { description: 'Display order' })
  order: number;

  @Field({ description: 'Created at timestamp' })
  createdAt: Date;

  @Field({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
