import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  CreateVariantInput,
  VariantData,
  VariantRepositoryPort,
} from '../ports/variant-repository.port';

export interface BaseResumeReader {
  findById(id: string): Promise<{ id: string; userId: string; isBase: boolean } | null>;
}

export const BASE_RESUME_READER = Symbol('BASE_RESUME_READER');

export class CreateVariantUseCase {
  constructor(
    private readonly variantRepo: VariantRepositoryPort,
    private readonly resumeReader: BaseResumeReader,
  ) {}

  async execute(input: {
    baseResumeId: string;
    userId: string;
    name: string;
    textOverrides?: Record<string, string>;
    visibilityOverrides?: Record<string, boolean>;
    orderOverrides?: Record<string, number>;
  }): Promise<VariantData> {
    const baseResume = await this.resumeReader.findById(input.baseResumeId);
    if (!baseResume) throw new EntityNotFoundException('Resume', input.baseResumeId);

    if (baseResume.userId !== input.userId) throw new ForbiddenException();

    const createInput: CreateVariantInput = {
      baseResumeId: input.baseResumeId,
      userId: input.userId,
      name: input.name,
      textOverrides: input.textOverrides ?? {},
      visibilityOverrides: input.visibilityOverrides ?? {},
      orderOverrides: input.orderOverrides ?? {},
    };

    return this.variantRepo.create(createInput);
  }
}
