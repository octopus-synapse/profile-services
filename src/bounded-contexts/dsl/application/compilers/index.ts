/**
 * DSL Compilers Index
 *
 * Layout and styling utilities for DSL compilation.
 * Section-specific compilation is now handled by the centralized
 * SectionProjectionAdapter in @/shared-kernel/types.
 */

export { buildPageLayout, mapColumnToId } from './layout-builder';
export { getPlaceholderData } from './placeholder';
export { buildSectionStyles } from './section-styles';
export type { ItemOverride } from './shared';
