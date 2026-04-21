import { SectionItemInvalidException } from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import { SectionDefinitionZodFactory } from '../../section-definition-zod.factory';

export class ItemContentValidatorPolicy {
  constructor(private readonly sectionSchemaFactory: SectionDefinitionZodFactory) {}

  validate(definition: unknown, content: Record<string, unknown>) {
    const schema = this.sectionSchemaFactory.buildSchema(definition);
    const result = schema.safeParse(content);

    if (!result.success) {
      throw new SectionItemInvalidException('content is invalid for section type');
    }

    return result.data;
  }
}
