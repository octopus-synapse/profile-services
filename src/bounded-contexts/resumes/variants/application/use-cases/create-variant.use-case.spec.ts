import { beforeEach, describe, expect, it } from 'bun:test';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type {
  CreateVariantInput,
  VariantData,
  VariantRepositoryPort,
} from '../ports/variant-repository.port';
import type { BaseResumeReader } from './create-variant.use-case';
import { CreateVariantUseCase } from './create-variant.use-case';

class InMemoryVariantRepository implements VariantRepositoryPort {
  private variants: VariantData[] = [];
  private idCounter = 0;

  async findById(id: string): Promise<VariantData | null> {
    return this.variants.find((v) => v.id === id) ?? null;
  }

  async findByBaseResumeId(baseResumeId: string): Promise<VariantData[]> {
    return this.variants.filter((v) => v.baseResumeId === baseResumeId);
  }

  async create(input: CreateVariantInput): Promise<VariantData> {
    const now = new Date();
    const variant: VariantData = {
      id: `variant-${++this.idCounter}`,
      baseResumeId: input.baseResumeId,
      userId: input.userId,
      name: input.name,
      textOverrides: input.textOverrides ?? {},
      visibilityOverrides: input.visibilityOverrides ?? {},
      orderOverrides: input.orderOverrides ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.variants.push(variant);
    return variant;
  }

  async update(id: string, input: Partial<CreateVariantInput>): Promise<VariantData> {
    const index = this.variants.findIndex((v) => v.id === id);
    if (index === -1) throw new Error('Variant not found');
    this.variants[index] = { ...this.variants[index], ...input, updatedAt: new Date() };
    return this.variants[index];
  }

  async delete(id: string): Promise<void> {
    this.variants = this.variants.filter((v) => v.id !== id);
  }
}

class StubResumeReader implements BaseResumeReader {
  private resumes: Array<{ id: string; userId: string; isBase: boolean }> = [];

  seed(resume: { id: string; userId: string; isBase: boolean }) {
    this.resumes.push(resume);
  }

  async findById(id: string) {
    return this.resumes.find((r) => r.id === id) ?? null;
  }
}

describe('CreateVariantUseCase', () => {
  let useCase: CreateVariantUseCase;
  let variantRepo: InMemoryVariantRepository;
  let resumeReader: StubResumeReader;

  beforeEach(() => {
    variantRepo = new InMemoryVariantRepository();
    resumeReader = new StubResumeReader();
    useCase = new CreateVariantUseCase(variantRepo, resumeReader);
  });

  it('creates variant when base resume exists and user owns it', async () => {
    resumeReader.seed({ id: 'resume-1', userId: 'user-1', isBase: true });

    const result = await useCase.execute({
      baseResumeId: 'resume-1',
      userId: 'user-1',
      name: 'Tailored for Google',
      textOverrides: { 'item-1:title': 'Senior Engineer' },
      visibilityOverrides: { 'section-2': false },
      orderOverrides: { 'section-1': 2 },
    });

    expect(result.id).toBeDefined();
    expect(result.baseResumeId).toBe('resume-1');
    expect(result.userId).toBe('user-1');
    expect(result.name).toBe('Tailored for Google');
    expect(result.textOverrides).toEqual({ 'item-1:title': 'Senior Engineer' });
    expect(result.visibilityOverrides).toEqual({ 'section-2': false });
    expect(result.orderOverrides).toEqual({ 'section-1': 2 });
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('throws when base resume not found', async () => {
    await expect(
      useCase.execute({
        baseResumeId: 'nonexistent',
        userId: 'user-1',
        name: 'My Variant',
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('throws when user does not own base resume', async () => {
    resumeReader.seed({ id: 'resume-1', userId: 'user-1', isBase: true });

    await expect(
      useCase.execute({
        baseResumeId: 'resume-1',
        userId: 'user-2',
        name: 'Unauthorized Variant',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('defaults empty overrides when not provided', async () => {
    resumeReader.seed({ id: 'resume-1', userId: 'user-1', isBase: true });

    const result = await useCase.execute({
      baseResumeId: 'resume-1',
      userId: 'user-1',
      name: 'Minimal Variant',
    });

    expect(result.textOverrides).toEqual({});
    expect(result.visibilityOverrides).toEqual({});
    expect(result.orderOverrides).toEqual({});
  });
});
