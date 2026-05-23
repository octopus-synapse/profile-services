/**
 * Export Bundle Use Case
 *
 * Runs PDF / DOCX / JSON exports in parallel and bundles them into a single
 * zip so a user can grab every format in one click. Per-format failures are
 * captured in `_errors.txt` inside the zip instead of aborting the whole
 * download — a broken JSON template should never cost you your PDF.
 */

import JSZip from 'jszip';
import type { LoggerPort } from '@/shared-kernel';
import {
  BundleAssemblyPartialException,
  ExportPayloadTooLargeException,
} from '../../../domain/exceptions/export.exceptions';

export type BundleFormat = 'pdf' | 'docx' | 'json';

/** Hard cap for the assembled zip. Anything larger than 50 MB is almost
 * certainly a misconfiguration upstream; refuse rather than ship a payload
 * the client will choke on. */
const MAX_BUNDLE_BYTES = 50 * 1024 * 1024;

export interface ExportBundleInput {
  userId: string;
  resumeId: string;
  formats?: BundleFormat[];
  language?: 'en' | 'pt';
  /**
   * When true, the use case throws BundleAssemblyPartialException if any
   * individual format failed instead of returning a partial zip with an
   * `_errors.txt` companion. The HTTP layer keeps the legacy soft-fail
   * default; programmatic callers (CLI, automation) opt in to the strict
   * variant.
   */
  strict?: boolean;
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
    private readonly logger: LoggerPort,
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
      if (input.strict) {
        // Strict callers want the exception so retries / alerts trigger off
        // a typed failure instead of a 200-with-errors-file.
        const missing = errors.map((line) => line.split(':', 1)[0]);
        throw new BundleAssemblyPartialException(missing);
      }
      zip.file('_errors.txt', errors.join('\n'));
    }

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    if (buffer.byteLength > MAX_BUNDLE_BYTES) {
      throw new ExportPayloadTooLargeException(MAX_BUNDLE_BYTES);
    }

    return buffer;
  }
}
