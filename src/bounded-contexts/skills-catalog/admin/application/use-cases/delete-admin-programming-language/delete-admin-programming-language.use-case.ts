import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminProgrammingLanguagesRepositoryPort } from '../../../domain/ports/admin-programming-languages.repository.port';

export class DeleteAdminProgrammingLanguageUseCase {
  constructor(private readonly repository: AdminProgrammingLanguagesRepositoryPort) {}

  async execute(slug: string): Promise<void> {
    const existing = await this.repository.findOne(slug);
    if (!existing) throw new EntityNotFoundException('ProgrammingLanguage', slug);
    await this.repository.delete(slug);
  }
}
