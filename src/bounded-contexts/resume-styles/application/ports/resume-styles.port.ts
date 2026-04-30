/**
 * Bundle token for the resume-styles BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Composition lives
 * in `resume-styles.composition.ts` — Nest-free.
 */

import type { CreateStyleUseCase } from '../use-cases/admin/create-style.use-case';
import type { DeleteStyleUseCase } from '../use-cases/admin/delete-style.use-case';
import type { UpdateStyleUseCase } from '../use-cases/admin/update-style.use-case';
import type { ApplyStyleToResumeUseCase } from '../use-cases/apply-style-to-resume.use-case';
import type { GetStyleUseCase } from '../use-cases/get-style.use-case';
import type { ListStylesUseCase } from '../use-cases/list-styles.use-case';
import type { PreviewStyleUseCase } from '../use-cases/preview-style.use-case';

export abstract class ResumeStylesUseCases {
  abstract readonly listStyles: ListStylesUseCase;
  abstract readonly getStyle: GetStyleUseCase;
  abstract readonly previewStyle: PreviewStyleUseCase;
  abstract readonly applyStyleToResume: ApplyStyleToResumeUseCase;
  abstract readonly createStyle: CreateStyleUseCase;
  abstract readonly updateStyle: UpdateStyleUseCase;
  abstract readonly deleteStyle: DeleteStyleUseCase;
}
