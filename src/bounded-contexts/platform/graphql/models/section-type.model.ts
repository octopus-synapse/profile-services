import { Field, ObjectType } from '@nestjs/graphql';

/**
 * GraphQL model representing a section type
 *
 * Section types define the schema and behavior of resume sections.
 */
@ObjectType({ description: 'Section type definition' })
export class SectionTypeModel {
  @Field({
    description: 'Unique key for the section type',
  })
  key: string;

  @Field({
    description: 'Semantic category for the section type',
  })
  semanticKind: string;

  @Field({ description: 'Human-readable display name' })
  displayName: string;

  @Field({ nullable: true, description: 'Description of the section type' })
  description?: string;
}
