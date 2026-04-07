import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AdminSectionTypesRepository } from '../infrastructure/repositories/admin-section-types.repository';
import {
  ADMIN_SECTION_TYPES_USE_CASES,
  type AdminSectionTypesUseCases,
} from './ports/admin-section-types.port';
import { CreateSectionTypeUseCase } from './use-cases/create-section-type/create-section-type.use-case';
import { DeleteSectionTypeUseCase } from './use-cases/delete-section-type/delete-section-type.use-case';
import { GetSectionTypeUseCase } from './use-cases/get-section-type/get-section-type.use-case';
import { GetSemanticKindsUseCase } from './use-cases/get-semantic-kinds/get-semantic-kinds.use-case';
import { ListSectionTypesAdminUseCase } from './use-cases/list-section-types-admin/list-section-types-admin.use-case';
import { UpdateSectionTypeUseCase } from './use-cases/update-section-type/update-section-type.use-case';

export { ADMIN_SECTION_TYPES_USE_CASES };

export function buildAdminSectionTypesUseCases(
  prisma: PrismaService,
): AdminSectionTypesUseCases {
  const repository = new AdminSectionTypesRepository(prisma);

  return {
    listSectionTypesAdminUseCase: new ListSectionTypesAdminUseCase(repository),
    getSectionTypeUseCase: new GetSectionTypeUseCase(repository),
    createSectionTypeUseCase: new CreateSectionTypeUseCase(repository),
    updateSectionTypeUseCase: new UpdateSectionTypeUseCase(repository),
    deleteSectionTypeUseCase: new DeleteSectionTypeUseCase(repository),
    getSemanticKindsUseCase: new GetSemanticKindsUseCase(repository),
  };
}
