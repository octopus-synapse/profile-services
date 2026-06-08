/**
 * Unit tests for RenderSampleResumeDslUseCase — the generic style preview
 * renderer. Uses the real compiler (no external deps) so the overlay +
 * section-preservation behaviour is exercised end to end.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { DslMigrationService } from '../../migrators';
import { DslCompilerService } from '../../services/dsl-compiler.service';
import { DslValidatorService } from '../../services/dsl-validator.service';
import { TokenResolverService } from '../../services/token-resolver.service';
import { RenderSampleResumeDslUseCase } from './render-sample-resume-dsl.use-case';

describe('RenderSampleResumeDslUseCase', () => {
  let useCase: RenderSampleResumeDslUseCase;

  beforeEach(() => {
    const compiler = new DslCompilerService(
      new DslValidatorService(),
      new TokenResolverService(),
      new DslMigrationService(stubLogger),
    );
    useCase = new RenderSampleResumeDslUseCase(compiler, stubLogger);
  });

  it('renders the sample sections even though the style config has empty sections', () => {
    // A real system style ships `sections: []`; it must NOT wipe the
    // sample sections (the bug that produced an empty preview).
    const { ast } = useCase.execute({
      styleConfig: { sections: [], tokens: { typography: { fontSize: 'lg' } } },
      target: 'pdf',
      locale: 'pt-BR',
    });

    // summary + work_experience + education + skills (header is split out)
    expect(ast.sections.length).toBeGreaterThanOrEqual(3);
    const ids = ast.sections.map((s) => s.sectionId);
    expect(ids).toContain('work_experience_v1');
    expect(ids).toContain('education_v1');
    expect(ast.header?.fullName).toBe('Alex Rivera');
  });

  it("applies the candidate style's colors to the preview", () => {
    const { ast } = useCase.execute({
      styleConfig: {
        tokens: {
          colors: {
            colors: {
              primary: '#ff0000',
              secondary: '#00ff00',
              background: '#ffffff',
              surface: '#ffffff',
              text: { primary: '#000000', secondary: '#333333', accent: '#ff0000' },
              border: '#cccccc',
              divider: '#eeeeee',
            },
            borderRadius: 'sm',
            shadows: 'none',
          },
        },
      },
      target: 'pdf',
      locale: 'en',
    });

    expect(ast.globalStyles.accent).toBe('#ff0000');
    expect(ast.header?.jobTitle).toBe('Software Engineer');
  });
});
