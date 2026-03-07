import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/**
 * Generic GraphQL model for section items
 *
 * This model represents any item within a resume section, with the actual
 * data stored as JSON in the 'content' field.
 *
 * Note: content is typed as 'unknown' in GraphQL and serialized as JSON object.
 * NestJS GraphQL automatically handles JSON serialization for complex types.
 */
@ObjectType({ description: 'Generic section item with JSON content' })
export class SectionItemModel {
  @Field(() => ID, { description: 'Unique identifier' })
  id: string;

  @Field({ description: 'Section type key' })
  sectionTypeKey: string;

  /**
   * JSON content stored with dynamic schema based on section type.
   * Uses GraphQL's native JSON object handling via resolve function.
   */
  content: Record<string, unknown>;

  @Field(() => Int, { description: 'Display order within section' })
  order: number;

  @Field({ description: 'Created at timestamp' })
  createdAt: Date;

  @Field({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
