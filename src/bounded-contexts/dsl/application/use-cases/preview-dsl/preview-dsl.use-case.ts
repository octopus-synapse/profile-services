/**
 * Compiles a raw DSL payload into an AST without persisting anything.
 * Used by the live editor preview pane: the user types DSL, the front
 * sends it as a JSON body, and the AST comes back ready to render.
 */

import type { ResumeAst } from '../../../domain/schemas/ast/resume-ast.schema';
import type { DslCompilerService } from '../../services/dsl-compiler.service';

export type RenderTarget = 'html' | 'pdf';

export class PreviewDslUseCase {
  constructor(private readonly compiler: DslCompilerService) {}

  execute(body: unknown, target: RenderTarget = 'html'): ResumeAst {
    return this.compiler.compileFromRaw(body, target);
  }
}
