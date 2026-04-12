/**
 * Test factory for GenericResumeSectionsService
 *
 * Creates service with in-memory repository for testing
 */

import { ItemContentValidatorPolicy } from '../services/generic-resume-sections/policies/item-content-validator.policy';
import { ResumeOwnershipPolicy } from '../services/generic-resume-sections/policies/resume-ownership.policy';
import { SectionTypePolicy } from '../services/generic-resume-sections/policies/section-type.policy';
import type { GenericResumeSectionsUseCases } from '../services/generic-resume-sections/ports/generic-resume-sections-repository.port';
import { CreateSectionItemUseCase } from '../services/generic-resume-sections/use-cases/create-section-item.use-case';
import { DeleteSectionItemUseCase } from '../services/generic-resume-sections/use-cases/delete-section-item.use-case';
import { ListResumeSectionsUseCase } from '../services/generic-resume-sections/use-cases/list-resume-sections.use-case';
import { ListSectionTypesUseCase } from '../services/generic-resume-sections/use-cases/list-section-types.use-case';
import { UpdateSectionItemUseCase } from '../services/generic-resume-sections/use-cases/update-section-item.use-case';
import { GenericResumeSectionsService } from '../services/generic-resume-sections.service';
import { SectionDefinitionZodFactory } from '../services/section-definition-zod.factory';
import { InMemoryGenericResumeSectionsRepository } from './in-memory-generic-resume-sections.repository';

export function createTestGenericResumeSectionsService(
  repository: InMemoryGenericResumeSectionsRepository,
): GenericResumeSectionsService {
  const sectionSchemaFactory = new SectionDefinitionZodFactory();
  const ownershipPolicy = new ResumeOwnershipPolicy(repository);
  const sectionTypePolicy = new SectionTypePolicy(repository);
  const contentValidatorPolicy = new ItemContentValidatorPolicy(sectionSchemaFactory);

  const useCases: GenericResumeSectionsUseCases = {
    listSectionTypesUseCase: new ListSectionTypesUseCase(repository),
    listResumeSectionsUseCase: new ListResumeSectionsUseCase(repository, ownershipPolicy),
    createSectionItemUseCase: new CreateSectionItemUseCase(
      repository,
      ownershipPolicy,
      contentValidatorPolicy,
    ),
    updateSectionItemUseCase: new UpdateSectionItemUseCase(
      repository,
      ownershipPolicy,
      sectionTypePolicy,
      contentValidatorPolicy,
    ),
    deleteSectionItemUseCase: new DeleteSectionItemUseCase(
      repository,
      ownershipPolicy,
      sectionTypePolicy,
    ),
  };

  return new GenericResumeSectionsService(useCases);
}
