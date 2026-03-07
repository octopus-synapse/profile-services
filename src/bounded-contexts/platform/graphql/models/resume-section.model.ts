import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { SectionItemModel } from './section-item.model';

/**
 * GraphQL model representing a resume section
 *
 * A section groups items under a single section type.
 */
@ObjectType({ description: 'Resume section containing items of the same type' })
export class ResumeSectionModel {
  @Field(() => ID, { description: 'Unique section identifier' })
  id: string;

  @Field({ description: 'Section type key' })
  sectionTypeKey: string;

  @Field({
    description: 'Semantic category for the section',
  })
  semanticKind: string;

  @Field({ description: 'Display title for the section' })
  title: string;

  @Field(() => Int, { description: 'Display order' })
  order: number;

  @Field({ description: 'Whether section is visible' })
  visible: boolean;

  @Field(() => [SectionItemModel], { description: 'Items in this section' })
  items: SectionItemModel[];

  @Field({ description: 'Created at timestamp' })
  createdAt: Date;

  @Field({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
