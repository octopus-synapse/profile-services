/**
 * DOCX Builders - Barrel Export
 *
 * GenericDocxSectionBuilder is the definition-driven builder.
 * All section rendering rules come from SectionType.definition.export.docx.
 */

// Header builder (for user info section)
export { DocxHeaderBuilder } from './docx-header.builder';
export type {
  GenericSectionItemContent,
  SectionRenderContext,
} from './generic-docx-section.builder';
// Definition-driven builder
export { GenericDocxSectionBuilder } from './generic-docx-section.builder';
