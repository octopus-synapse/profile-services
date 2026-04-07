/**
 * DOCX Builder Port
 *
 * Abstraction for DOCX document generation.
 */

export abstract class DocxBuilderPort {
  abstract generate(userId: string): Promise<Buffer>;
}
