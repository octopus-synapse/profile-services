import type { SectionTypeData } from '../../../domain/config/onboarding-steps.config';
import type { SectionTypeDefinitionPort } from '../../../domain/ports/section-type-definition.port';

export class GetSectionTypeDefinitionsUseCase {
  constructor(private readonly sectionTypeDefinition: SectionTypeDefinitionPort) {}

  async execute(locale = 'en'): Promise<SectionTypeData[]> {
    return this.sectionTypeDefinition.findAll(locale);
  }
}
