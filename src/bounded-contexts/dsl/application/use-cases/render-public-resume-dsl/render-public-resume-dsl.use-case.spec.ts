import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import type { DslCompilerService } from '../../services/dsl-compiler.service';
import type { DslValidatorService } from '../../services/dsl-validator.service';
import {
  InMemoryDslCompiler,
  InMemoryDslValidator,
  InMemoryResumeDslRepository,
  mockAst,
} from '../../../testing';
import { RenderPublicResumeDslUseCase } from './render-public-resume-dsl.use-case';

describe('RenderPublicResumeDslUseCase', () => {
  let repo: InMemoryResumeDslRepository;
  let validator: InMemoryDslValidator;
  let compiler: InMemoryDslCompiler;
  let useCase: RenderPublicResumeDslUseCase;

  beforeEach(() => {
    repo = new InMemoryResumeDslRepository();
    validator = new InMemoryDslValidator();
    compiler = new InMemoryDslCompiler();
    useCase = new RenderPublicResumeDslUseCase(
      repo,
      validator as unknown as DslValidatorService,
      compiler as unknown as DslCompilerService,
      stubLogger,
    );
  });

  it('renders the public resume by slug', async () => {
    repo.seedResume({ id: 'r-1', userId: 'u-1' });
    repo.seedShare({ id: 's-1', slug: 'john-doe', resumeId: 'r-1' });

    const result = await useCase.execute({ slug: 'john-doe', target: 'html', locale: 'en' });

    expect(result.ast).toEqual(mockAst);
    expect(result.slug).toBe('john-doe');
  });

  it('throws when the share does not exist', async () => {
    await expect(
      useCase.execute({ slug: 'nope', target: 'html', locale: 'en' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws when the share is inactive', async () => {
    repo.seedResume({ id: 'r-1', userId: 'u-1' });
    repo.seedShare({ id: 's-1', slug: 'inactive', resumeId: 'r-1', isActive: false });

    await expect(
      useCase.execute({ slug: 'inactive', target: 'html', locale: 'en' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws when the share has expired', async () => {
    repo.seedResume({ id: 'r-1', userId: 'u-1' });
    repo.seedShare({
      id: 's-1',
      slug: 'expired',
      resumeId: 'r-1',
      expiresAt: new Date('2020-01-01'),
    });

    await expect(
      useCase.execute({ slug: 'expired', target: 'html', locale: 'en' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
