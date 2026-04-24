import { Injectable } from '@nestjs/common';
import {
  type ListStylesArgs,
  type PaginatedStyles,
  ResumeStyleRepositoryPort,
} from '../../domain/ports/resume-style.repository.port';

@Injectable()
export class ListStylesUseCase {
  constructor(private readonly repo: ResumeStyleRepositoryPort) {}

  async execute(args?: ListStylesArgs): Promise<PaginatedStyles> {
    return this.repo.list(args);
  }
}
