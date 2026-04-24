import { Injectable } from '@nestjs/common';
import { StyleNotFoundError } from '../../domain/exceptions/resume-styles.exceptions';
import { ResumeStyleRepositoryPort } from '../../domain/ports/resume-style.repository.port';
import type { StyleDetail } from '../../domain/types';

@Injectable()
export class GetStyleUseCase {
  constructor(private readonly repo: ResumeStyleRepositoryPort) {}

  async execute(id: string): Promise<StyleDetail> {
    const row = await this.repo.findById(id);
    if (!row) throw new StyleNotFoundError(id);
    return row;
  }
}
