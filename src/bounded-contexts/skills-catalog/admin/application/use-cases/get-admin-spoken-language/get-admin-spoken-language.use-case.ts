import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { AdminSpokenLanguagesRepositoryPort } from '../../../domain/ports/admin-spoken-languages.repository.port';

export class GetAdminSpokenLanguageUseCase {
  constructor(private readonly repository: AdminSpokenLanguagesRepositoryPort) {}

  async execute(code: string) {
    const item = await this.repository.findOne(code);
    if (!item) throw new EntityNotFoundException('SpokenLanguage', code);
    return item;
  }
}
