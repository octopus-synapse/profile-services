import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminProgrammingLanguagesRepositoryPort } from '../../../domain/ports/admin-programming-languages.repository.port';

export class UpdateAdminProgrammingLanguageUseCase {
  constructor(private readonly repository: AdminProgrammingLanguagesRepositoryPort) {}

  async execute(slug: string, input: Record<string, unknown>) {
    const existing = await this.repository.findOne(slug);
    if (!existing) throw new EntityNotFoundException('ProgrammingLanguage', slug);
    return this.repository.update(slug, input);
  }
}
