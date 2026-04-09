/**
 * Typst Data Serializer Service
 *
 * Transforms ResumeAst into JSON consumable by Typst templates.
 * Handles unit conversions (px → pt) and font family mapping.
 */

import { Injectable } from '@nestjs/common';
import type { ResumeAst } from '@/bounded-contexts/dsl/domain/schemas/ast/resume-ast.schema';
import { FONT_FAMILIES } from '@/bounded-contexts/dsl/domain/value-objects/design-token-config';

/**
 * Maps CSS font-family stacks to the primary font name recognized by Typst.
 * Built from FONT_FAMILIES config (design-token-config.ts).
 */
const CSS_TO_TYPST_FONT: Record<string, string> = Object.fromEntries(
  Object.entries(FONT_FAMILIES).map(([, cssStack]) => {
    const primaryFont = cssStack.split(',')[0].trim();
    return [cssStack, primaryFont];
  }),
);

/** 1 CSS px = 0.75 pt at 96 DPI */
const PX_TO_PT = 0.75;

@Injectable()
export class TypstDataSerializerService {
  /**
   * Serialize ResumeAst to JSON string for Typst templates.
   * Converts px values to pt, maps CSS font stacks to Typst font names.
   */
  serialize(ast: ResumeAst): string {
    const data = this.transform(ast);
    return JSON.stringify(data, null, 2);
  }

  /**
   * Transform ResumeAst into the structure Typst templates consume.
   */
  transform(ast: ResumeAst): TypstResumeData {
    return {
      meta: ast.meta,
      header: ast.header ?? null,
      page: {
        widthMm: ast.page.widthMm,
        heightMm: ast.page.heightMm,
        marginTopMm: ast.page.marginTopMm,
        marginBottomMm: ast.page.marginBottomMm,
        marginLeftMm: ast.page.marginLeftMm,
        marginRightMm: ast.page.marginRightMm,
        columns: ast.page.columns.map((col) => ({
          id: col.id,
          widthPercentage: col.widthPercentage,
          order: col.order,
        })),
        columnGapMm: ast.page.columnGapMm,
      },
      sections: ast.sections.map((section) => ({
        sectionId: section.sectionId,
        columnId: section.columnId,
        order: section.order,
        data: section.data,
        styles: {
          container: {
            backgroundColor: section.styles.container.backgroundColor,
            borderColor: section.styles.container.borderColor,
            borderWidthPt: this.pxToPt(section.styles.container.borderWidthPx),
            borderRadiusPt: this.pxToPt(section.styles.container.borderRadiusPx),
            paddingPt: this.pxToPt(section.styles.container.paddingPx),
            marginBottomPt: this.pxToPt(section.styles.container.marginBottomPx),
            shadow: section.styles.container.shadow,
          },
          title: this.transformTypography(section.styles.title),
          content: this.transformTypography(section.styles.content),
        },
      })),
      globalStyles: ast.globalStyles,
    };
  }

  private transformTypography(typo: ResumeAst['sections'][0]['styles']['title']): TypstTypography {
    return {
      fontFamily: this.mapFont(typo.fontFamily),
      fontSizePt: this.pxToPt(typo.fontSizePx),
      lineHeight: typo.lineHeight,
      fontWeight: typo.fontWeight,
      textTransform: typo.textTransform,
      textDecoration: typo.textDecoration,
    };
  }

  private mapFont(cssFontFamily: string): string {
    return CSS_TO_TYPST_FONT[cssFontFamily] ?? cssFontFamily.split(',')[0].trim();
  }

  private pxToPt(px: number): number {
    return Math.round(px * PX_TO_PT * 100) / 100;
  }
}

// --- Types for the serialized output ---

export interface TypstResumeHeader {
  fullName: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

export interface TypstResumeData {
  meta: { version: string; generatedAt: string };
  header: TypstResumeHeader | null;
  page: TypstPageLayout;
  sections: TypstPlacedSection[];
  globalStyles: {
    background: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
}

export interface TypstPageLayout {
  widthMm: number;
  heightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  columns: Array<{ id: string; widthPercentage: number; order: number }>;
  columnGapMm: number;
}

export interface TypstPlacedSection {
  sectionId: string;
  columnId: string;
  order: number;
  data: unknown;
  styles: {
    container: TypstBoxStyle;
    title: TypstTypography;
    content: TypstTypography;
  };
}

export interface TypstBoxStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidthPt: number;
  borderRadiusPt: number;
  paddingPt: number;
  marginBottomPt: number;
  shadow?: string;
}

export interface TypstTypography {
  fontFamily: string;
  fontSizePt: number;
  lineHeight: number;
  fontWeight: number;
  textTransform: string;
  textDecoration: string;
}
