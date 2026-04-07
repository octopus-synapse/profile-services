/**
 * Export Composition
 *
 * Wires export use cases with their dependencies following Clean Architecture.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SectionTypeRepository } from '@/bounded-contexts/resumes/shared-kernel/infrastructure/repositories';
import type { DocxBuilderPort } from '../../domain/ports/docx-builder.port';
import type { PdfGeneratorPort } from '../../domain/ports/pdf-generator.port';
import { ResumeDataRepository } from '../../infrastructure/adapters/persistence/resume-data.repository';
import { SectionOrderingAdapter } from '../../infrastructure/adapters/persistence/section-ordering.adapter';
import { EXPORT_USE_CASES, type ExportUseCases } from '../ports/export.port';
import { ExportDocxUseCase } from '../use-cases/export-docx/export-docx.use-case';
import { ExportJsonUseCase } from '../use-cases/export-json/export-json.use-case';
import { ExportLatexUseCase } from '../use-cases/export-latex/export-latex.use-case';
import { ExportPdfUseCase } from '../use-cases/export-pdf/export-pdf.use-case';

export { EXPORT_USE_CASES };

export function buildExportUseCases(
  prisma: PrismaService,
  docxBuilder: DocxBuilderPort,
  pdfGenerator: PdfGeneratorPort,
  sectionTypeRepo?: SectionTypeRepository,
): ExportUseCases {
  const resumeDataRepository = new ResumeDataRepository(prisma);
  const sectionOrdering = sectionTypeRepo
    ? new SectionOrderingAdapter(sectionTypeRepo)
    : undefined;

  return {
    exportDocxUseCase: new ExportDocxUseCase(docxBuilder),
    exportPdfUseCase: new ExportPdfUseCase(pdfGenerator),
    exportJsonUseCase: new ExportJsonUseCase(resumeDataRepository),
    exportLatexUseCase: new ExportLatexUseCase(resumeDataRepository, sectionOrdering),
  };
}
