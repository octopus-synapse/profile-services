/**
 * Static catalog of export formats accepted by the resume export
 * pipeline. Lives in the application layer (rather than as a literal
 * in the controller) so the SDK contract has a single source of truth.
 *
 * Each entry carries enough metadata for the frontend to render a
 * dynamic format picker without hard-coding labels, MIME types or
 * extensions.
 */

export type ExportFormatKey = 'pdf' | 'docx' | 'json' | 'latex';

export interface ExportFormatDescriptor {
  readonly key: ExportFormatKey;
  readonly label: string;
  readonly mimeType: string;
  readonly extension: string;
  readonly enabled: boolean;
  readonly requiresPro?: boolean;
}

const FORMATS: readonly ExportFormatDescriptor[] = [
  {
    key: 'pdf',
    label: 'PDF',
    mimeType: 'application/pdf',
    extension: '.pdf',
    enabled: true,
  },
  {
    key: 'docx',
    label: 'DOCX',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    enabled: true,
  },
  {
    key: 'json',
    label: 'JSON',
    mimeType: 'application/json',
    extension: '.json',
    enabled: true,
  },
  {
    key: 'latex',
    label: 'LaTeX',
    mimeType: 'application/x-tex',
    extension: '.tex',
    enabled: true,
  },
];

export class ListExportFormatsUseCase {
  // eslint-disable-next-line @typescript-eslint/require-await -- POJO surface stays async for parity with sibling use cases.
  async execute(): Promise<readonly ExportFormatDescriptor[]> {
    return FORMATS;
  }
}
