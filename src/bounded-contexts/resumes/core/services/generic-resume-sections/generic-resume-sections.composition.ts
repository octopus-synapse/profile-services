import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionDefinitionZodFactory } from '../section-definition-zod.factory';
import { ItemContentValidatorPolicy } from './policies/item-content-validator.policy';
import { ResumeOwnershipPolicy } from './policies/resume-ownership.policy';
import { SectionTypePolicy } from './policies/section-type.policy';
import {
  GENERIC_RESUME_SECTIONS_USE_CASES,
  type GenericResumeSectionsUseCases,
} from './ports/generic-resume-sections-repository.port';
import { GenericResumeSectionsRepository } from './repository/generic-resume-sections.repository';
import { CreateSectionItemUseCase } from './use-cases/create-section-item.use-case';
import { DeleteSectionItemUseCase } from './use-cases/delete-section-item.use-case';
import { ListResumeSectionsUseCase } from './use-cases/list-resume-sections.use-case';
import { ListSectionTypesUseCase } from './use-cases/list-section-types.use-case';
import { UpdateSectionItemUseCase } from './use-cases/update-section-item.use-case';

export { GENERIC_RESUME_SECTIONS_USE_CASES };

export function buildGenericResumeSectionsUseCases(
  prisma: PrismaService,
  sectionSchemaFactory: SectionDefinitionZodFactory,
): GenericResumeSectionsUseCases {
  const repository = new GenericResumeSectionsRepository(prisma);
  const ownershipPolicy = new ResumeOwnershipPolicy(repository);
  const sectionTypePolicy = new SectionTypePolicy(repository);
  const contentValidatorPolicy = new ItemContentValidatorPolicy(sectionSchemaFactory);

  return {
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
}
