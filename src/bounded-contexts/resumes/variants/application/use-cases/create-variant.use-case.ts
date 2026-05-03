import { LoggerPort } from '@/shared-kernel';
import { ResumeAccessDeniedException, ResumeNotFoundException } from '../../../domain/exceptions';
import type { CreateVariantInput, VariantData } from '../ports/variant-repository.port';
import { VariantRepositoryPort } from '../ports/variant-repository.port';

export abstract class BaseResumeReader {
  abstract findById(id: string): Promise<{ id: string; userId: string; isBase: boolean } | null>;
}

export class CreateVariantUseCase {
  constructor(
    private readonly variantRepo: VariantRepositoryPort,
    private readonly resumeReader: BaseResumeReader,
    private readonly logger: LoggerPort,
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
    if (!baseResume) throw new ResumeNotFoundException();

    if (baseResume.userId !== input.userId) throw new ResumeAccessDeniedException();

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
