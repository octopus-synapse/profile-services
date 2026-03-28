import { Injectable } from '@nestjs/common';
import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
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

  render(resumeId: string, userId: string, target: RenderTarget) {
    return this.repository.render(resumeId, userId, target);
  }

  renderPublic(slug: string, target: RenderTarget) {
    return this.repository.renderPublic(slug, target);
  }
}
