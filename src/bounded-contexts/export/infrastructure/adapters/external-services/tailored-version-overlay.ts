/**
 * Shared step for the PDF/HTML export pipelines: resolve a tailored
 * `ResumeVersion` and overlay its rewrites onto the rendered AST.
 *
 * Guards: the version must exist, belong to the resolved resume, and be a
 * tailored row — otherwise 404 (`EntityNotFoundException('ResumeVersion')`).
 * Resume ownership was already enforced upstream by `renderResumeDsl`, so
 * the resume-equality check closes the loop against foreign version ids.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { applyTailoredSnapshotToAst } from '../../helpers/apply-tailored-snapshot.helper';

export async function overlayTailoredVersion<T>(
  prisma: PrismaService,
  ast: T,
  resumeId: string,
  versionId: string,
): Promise<T> {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: versionId },
    select: { resumeId: true, isTailored: true, snapshot: true },
  });
  if (!version || version.resumeId !== resumeId || !version.isTailored) {
    throw new EntityNotFoundException('ResumeVersion', versionId);
  }
  return applyTailoredSnapshotToAst(ast, version.snapshot);
}
