import { Injectable } from '@nestjs/common';
import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import { DEFAULT_LOCALE, type SupportedLocale } from '@/shared-kernel/utils/locale-resolver';
import { DslRepository } from './dsl.repository';

type RenderTarget = 'html' | 'pdf';

@Injectable()
export class DslService {
  constructor(private readonly repository: DslRepository) {}

  validate(body: Record<string, unknown>) {
    return this.repository.validate(body);
  }

  preview(body: Record<string, unknown>, target: RenderTarget): ResumeAst {
    return this.repository.preview(body, target);
  }

  render(
    resumeId: string,
    userId: string,
    target: RenderTarget,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ) {
    return this.repository.render(resumeId, userId, target, locale);
  }

  renderPublic(slug: string, target: RenderTarget, locale: SupportedLocale = DEFAULT_LOCALE) {
    return this.repository.renderPublic(slug, target, locale);
  }
}
