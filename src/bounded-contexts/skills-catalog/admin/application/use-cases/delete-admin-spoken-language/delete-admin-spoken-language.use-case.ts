import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminSpokenLanguagesRepositoryPort } from '../../../domain/ports/admin-spoken-languages.repository.port';

export class DeleteAdminSpokenLanguageUseCase {
  constructor(private readonly repository: AdminSpokenLanguagesRepositoryPort) {}

  async execute(code: string): Promise<void> {
    const existing = await this.repository.findOne(code);
    if (!existing) throw new EntityNotFoundException('SpokenLanguage', code);
    await this.repository.delete(code);
  }
}
