/**
 * Export Composition
 *
 * Wires export use cases with their dependencies following Clean Architecture.
 * PDF and DOCX are the two formats the app offers; LaTeX, JSON and the
 * multi-format zip were removed with the rest of the surface no screen
 * called (ADR-005).
 */
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import type { LoggerPort } from '@/shared-kernel';
import { DocxBuilderPort } from '../../domain/ports/docx-builder.port';
import { PdfGeneratorPort } from '../../domain/ports/pdf-generator.port';
import { ExportUseCases } from '../ports/export.port';
import { ExportDocxUseCase } from '../use-cases/export-docx/export-docx.use-case';
import { ExportPdfUseCase } from '../use-cases/export-pdf/export-pdf.use-case';

export { ExportUseCases };

export function buildExportUseCases(
  _prisma: PrismaService,
  docxBuilder: DocxBuilderPort,
  pdfGenerator: PdfGeneratorPort,
  _logger: LoggerPort,
  _sectionTypeRepo?: SectionTypeRepository,
): ExportUseCases {
  return {
    exportDocxUseCase: new ExportDocxUseCase(docxBuilder),
    exportPdfUseCase: new ExportPdfUseCase(pdfGenerator),
  };
}
