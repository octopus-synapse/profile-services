/**
 * Export Bundle Use Case
 *
 * Runs PDF / DOCX / JSON exports in parallel and bundles them into a single
 * zip so a user can grab every format in one click. Per-format failures are
 * captured in `_errors.txt` inside the zip instead of aborting the whole
 * download — a broken JSON template should never cost you your PDF.
 */

import JSZip from 'jszip';

export type BundleFormat = 'pdf' | 'docx' | 'json';

export interface ExportBundleInput {
  userId: string;
  resumeId: string;
  formats?: BundleFormat[];
  language?: 'en' | 'pt';
}

interface PdfUseCase {
  execute: (dto?: { userId?: string; lang?: string }) => Promise<Buffer>;
}

interface DocxUseCase {
  execute: (dto: { userId: string }) => Promise<Buffer>;
}

interface JsonUseCase {
  executeAsBuffer: (dto: {
    resumeId: string;
    format?: 'jsonresume' | 'profile';
    language?: 'en' | 'pt';
  }) => Promise<Buffer>;
}

export class ExportBundleUseCase {
  constructor(
    private readonly pdfUseCase: PdfUseCase,
    private readonly docxUseCase: DocxUseCase,
    private readonly jsonUseCase: JsonUseCase,
  ) {}

  async execute(input: ExportBundleInput): Promise<Buffer> {
    const formats: BundleFormat[] = input.formats ?? ['pdf', 'docx', 'json'];
    const zip = new JSZip();
    const errors: string[] = [];

    const tasks: Array<Promise<void>> = [];

    if (formats.includes('pdf')) {
      tasks.push(
        this.pdfUseCase
          .execute({ userId: input.userId, lang: input.language })
          .then((buf) => {
            zip.file('resume.pdf', buf);
          })
          .catch((err: Error) => {
            errors.push(`pdf: ${err.message}`);
          }),
      );
    }

    if (formats.includes('docx')) {
      tasks.push(
        this.docxUseCase
          .execute({ userId: input.userId })
          .then((buf) => {
            zip.file('resume.docx', buf);
          })
          .catch((err: Error) => {
            errors.push(`docx: ${err.message}`);
          }),
      );
    }

    if (formats.includes('json')) {
      tasks.push(
        this.jsonUseCase
          .executeAsBuffer({
            resumeId: input.resumeId,
            format: 'jsonresume',
            language: input.language,
          })
          .then((buf) => {
            zip.file('resume.json', buf);
          })
          .catch((err: Error) => {
            errors.push(`json: ${err.message}`);
          }),
      );
    }

    await Promise.all(tasks);

    if (errors.length > 0) {
      zip.file('_errors.txt', errors.join('\n'));
    }

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}
