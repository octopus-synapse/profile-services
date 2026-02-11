import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EducationModel } from './education.model';
import { ExperienceModel } from './experience.model';
import { SkillModel } from './skill.model';

/**
 * Resume template enum for GraphQL
 */
export enum ResumeTemplate {
  CLASSIC = 'CLASSIC',
  MODERN = 'MODERN',
  CREATIVE = 'CREATIVE',
  MINIMAL = 'MINIMAL',
  PROFESSIONAL = 'PROFESSIONAL',
  ACADEMIC = 'ACADEMIC',
  TECH = 'TECH',
}

registerEnumType(ResumeTemplate, {
  name: 'ResumeTemplate',
  description: 'Available resume templates',
});

/**
 * GraphQL ObjectType for Resume
 *
 * Maps to the Resume Prisma entity with field resolvers for relations.
 */
@ObjectType({ description: 'Complete resume document' })
export class ResumeModel {
  @Field(() => ID, { description: 'Unique identifier' })
  id: string;

  @Field({ description: 'User ID who owns this resume' })
  userId: string;

  @Field({ nullable: true, description: 'Resume title' })
  title?: string;

  @Field({ nullable: true, description: 'Full name' })
  fullName?: string;

  @Field({ nullable: true, description: 'Email address' })
  emailContact?: string;

  @Field({ nullable: true, description: 'Phone number' })
  phone?: string;

  @Field({ nullable: true, description: 'Location/City' })
  location?: string;

  @Field({ nullable: true, description: 'Professional summary' })
  summary?: string;

  @Field(() => ResumeTemplate, { description: 'Resume template' })
  template: ResumeTemplate;

  @Field({ nullable: true, description: 'Accent color' })
  accentColor?: string;

  @Field({ description: 'Is this resume public' })
  isPublic: boolean;

  @Field({ description: 'Created at timestamp' })
  createdAt: Date;

  @Field({ description: 'Updated at timestamp' })
  updatedAt: Date;

  // Field resolvers for relations (will be populated by DataLoader)
  @Field(() => [ExperienceModel], { description: 'Work experiences' })
  experiences?: ExperienceModel[];

  @Field(() => [EducationModel], { description: 'Education entries' })
  educations?: EducationModel[];

  @Field(() => [SkillModel], { description: 'Skills' })
  skills?: SkillModel[];
}
