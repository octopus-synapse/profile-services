import { Field, ObjectType } from '@nestjs/graphql';

/**
 * GraphQL model representing a section type
 *
 * Section types define the schema and behavior of resume sections.
 * Examples: work_experience_v1, education_v1, skill_set_v1
 */
@ObjectType({ description: 'Section type definition' })
export class SectionTypeModel {
  @Field({
    description: 'Unique key for the section type (e.g., work_experience_v1)',
  })
  key: string;

  @Field({
    description: 'Semantic category (e.g., WORK_EXPERIENCE, EDUCATION)',
  })
  semanticKind: string;

  @Field({ description: 'Human-readable display name' })
  displayName: string;

  @Field({ nullable: true, description: 'Description of the section type' })
  description?: string;
}
