import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminProgrammingLanguagesRepositoryPort } from '../../../domain/ports/admin-programming-languages.repository.port';

export class GetAdminProgrammingLanguageUseCase {
  constructor(private readonly repository: AdminProgrammingLanguagesRepositoryPort) {}

  async execute(slug: string) {
    const item = await this.repository.findOne(slug);
    if (!item) throw new EntityNotFoundException('ProgrammingLanguage', slug);
    return item;
  }
}
