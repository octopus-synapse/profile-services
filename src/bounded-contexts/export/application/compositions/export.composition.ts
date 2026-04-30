/**
 * Export Composition
 *
 * Wires export use cases with their dependencies following Clean Architecture.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import type { LoggerPort } from '@/shared-kernel';
import { DocxBuilderPort } from '../../domain/ports/docx-builder.port';
import { PdfGeneratorPort } from '../../domain/ports/pdf-generator.port';
import { ResumeDataRepository } from '../../infrastructure/adapters/persistence/resume-data.repository';
import { SectionOrderingAdapter } from '../../infrastructure/adapters/persistence/section-ordering.adapter';
import { ExportUseCases } from '../ports/export.port';
import { ExportBundleUseCase } from '../use-cases/export-bundle/export-bundle.use-case';
import { ExportDocxUseCase } from '../use-cases/export-docx/export-docx.use-case';
import { ExportJsonUseCase } from '../use-cases/export-json/export-json.use-case';
import { ExportLatexUseCase } from '../use-cases/export-latex/export-latex.use-case';
import { ExportPdfUseCase } from '../use-cases/export-pdf/export-pdf.use-case';

export { ExportUseCases };

export function buildExportUseCases(
  prisma: PrismaService,
  docxBuilder: DocxBuilderPort,
  pdfGenerator: PdfGeneratorPort,
  logger: LoggerPort,
  sectionTypeRepo?: SectionTypeRepository,
): ExportUseCases {
  const resumeDataRepository = new ResumeDataRepository(prisma);
  const sectionOrdering = sectionTypeRepo ? new SectionOrderingAdapter(sectionTypeRepo) : undefined;

  const exportDocxUseCase = new ExportDocxUseCase(docxBuilder);
  const exportPdfUseCase = new ExportPdfUseCase(pdfGenerator);
  const exportJsonUseCase = new ExportJsonUseCase(resumeDataRepository);
  const exportLatexUseCase = new ExportLatexUseCase(resumeDataRepository, logger, sectionOrdering);

  return {
    exportDocxUseCase,
    exportPdfUseCase,
    exportJsonUseCase,
    exportLatexUseCase,
    exportBundleUseCase: new ExportBundleUseCase(
      exportPdfUseCase,
      exportDocxUseCase,
      exportJsonUseCase,
      logger,
    ),
  };
}
