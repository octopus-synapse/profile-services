import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { ResumeNoActiveStyleException } from '../../../domain/exceptions/dsl.exceptions';
import {
  InMemoryDslCompiler,
  InMemoryDslValidator,
  InMemoryResumeDslRepository,
  mockAst,
} from '../../../testing';
import type { DslCompilerService } from '../../services/dsl-compiler.service';
import type { DslValidatorService } from '../../services/dsl-validator.service';
import { RenderResumeDslUseCase } from './render-resume-dsl.use-case';

describe('RenderResumeDslUseCase', () => {
  let repo: InMemoryResumeDslRepository;
  let validator: InMemoryDslValidator;
  let compiler: InMemoryDslCompiler;
  let useCase: RenderResumeDslUseCase;

  beforeEach(() => {
    repo = new InMemoryResumeDslRepository();
    validator = new InMemoryDslValidator();
    compiler = new InMemoryDslCompiler();
    useCase = new RenderResumeDslUseCase(
      repo,
      validator as unknown as DslValidatorService,
      compiler as unknown as DslCompilerService,
      stubLogger,
    );
  });

  it('renders the owned resume into an AST for HTML by default', async () => {
    repo.seedResume({ id: 'r-1', userId: 'u-1' });

    const result = await useCase.execute({
      resumeId: 'r-1',
      userId: 'u-1',
      target: 'html',
      locale: 'en',
    });

    expect(result.ast).toEqual(mockAst);
    expect(result.resumeId).toBe('r-1');
  });

  it('throws when the resume does not exist', async () => {
    await expect(
      useCase.execute({ resumeId: 'missing', userId: 'u-1', target: 'html', locale: 'en' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws when the requesting user does not own the resume', async () => {
    repo.seedResume({ id: 'r-1', userId: 'someone-else' });

    await expect(
      useCase.execute({ resumeId: 'r-1', userId: 'u-1', target: 'html', locale: 'en' }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws when the resume has no active style', async () => {
    repo.seedResume({
      id: 'r-1',
      userId: 'u-1',
      style: null,
      customTheme: null,
    });

    await expect(
      useCase.execute({ resumeId: 'r-1', userId: 'u-1', target: 'html', locale: 'en' }),
    ).rejects.toBeInstanceOf(ResumeNoActiveStyleException);
  });

  it('lets the caller override the styleConfig (draft theme rendering)', async () => {
    repo.seedResume({ id: 'r-1', userId: 'u-1' });
    const draftConfig = { version: '1.0.0', tokens: { colors: { primary: '#abcdef' } } };

    await useCase.execute({
      resumeId: 'r-1',
      userId: 'u-1',
      target: 'html',
      locale: 'en',
      themeStyleConfig: draftConfig,
    });

    const compiled = compiler.getLastCompiledDsl();
    expect(compiled).toMatchObject({ tokens: { colors: { primary: '#abcdef' } } });
  });
});
