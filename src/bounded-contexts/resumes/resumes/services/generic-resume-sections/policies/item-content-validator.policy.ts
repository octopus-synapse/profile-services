import { BadRequestException } from '@nestjs/common';
import { SectionDefinitionZodFactory } from '../../section-definition-zod.factory';

export class ItemContentValidatorPolicy {
  constructor(private readonly sectionSchemaFactory: SectionDefinitionZodFactory) {}

  validate(definition: unknown, content: Record<string, unknown>) {
    const schema = this.sectionSchemaFactory.buildSchema(definition);
    const result = schema.safeParse(content);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Section item content is invalid for section type',
        errors: result.error.issues,
      });
    }

    return result.data;
  }
}
