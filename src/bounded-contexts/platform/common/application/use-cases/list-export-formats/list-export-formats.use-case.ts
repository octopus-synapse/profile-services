/**
 * Static catalog of export formats accepted by the resume export
 * pipeline. Lives in the application layer (rather than as a literal
 * in the controller) so the SDK contract has a single source of truth.
 */

export type ExportFormat = 'PDF' | 'DOCX' | 'JSON';

export class ListExportFormatsUseCase {
  // eslint-disable-next-line @typescript-eslint/require-await -- POJO surface stays async for parity with sibling use cases.
  async execute(): Promise<readonly ExportFormat[]> {
    return ['PDF', 'DOCX', 'JSON'];
  }
}
