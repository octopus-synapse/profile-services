import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminSpokenLanguagesRepositoryPort } from '../../../domain/ports/admin-spoken-languages.repository.port';

export class UpdateAdminSpokenLanguageUseCase {
  constructor(private readonly repository: AdminSpokenLanguagesRepositoryPort) {}

  async execute(code: string, input: Record<string, unknown>) {
    const existing = await this.repository.findOne(code);
    if (!existing) throw new EntityNotFoundException('SpokenLanguage', code);
    return this.repository.update(code, input);
  }
}
