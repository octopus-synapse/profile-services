import { Injectable } from '@nestjs/common';
import {
  StyleNotEditableError,
  StyleNotFoundError,
} from '../../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../../domain/ports/resume-style.repository.port';

@Injectable()
export class DeleteStyleUseCase {
  constructor(private readonly repo: ResumeStyleRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const current = await this.repo.findById(id);
    if (!current) throw new StyleNotFoundError(id);
    if (current.isSystem) throw new StyleNotEditableError(id);
    await this.repo.delete(id);
  }
}
