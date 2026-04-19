import { ValidationException } from '@/shared-kernel/exceptions/domain.exceptions';
import { SectionDefinitionZodFactory } from '../../section-definition-zod.factory';

export class ItemContentValidatorPolicy {
  constructor(private readonly sectionSchemaFactory: SectionDefinitionZodFactory) {}

  validate(definition: unknown, content: Record<string, unknown>) {
    const schema = this.sectionSchemaFactory.buildSchema(definition);
    const result = schema.safeParse(content);

    if (!result.success) {
      throw new ValidationException('Section item content is invalid for section type');
    }

    return result.data;
  }
}
