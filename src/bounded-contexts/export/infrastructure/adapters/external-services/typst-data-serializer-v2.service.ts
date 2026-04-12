/**
 * Typst Data Serializer V2 Service
 *
 * Transforms ResumeAstV2 (with ultra-granular design tokens) into JSON
 * consumable by V2 Typst templates. Extends the V1 approach with full
 * theme token passthrough.
 *
 * Unit conversions: px to pt at 96 DPI (1px = 0.75pt).
 * Font mapping: CSS font stack to primary font name.
 */

import { Injectable } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Input types (locally defined to avoid importing from existing files)
// ---------------------------------------------------------------------------

interface ResumeAstV2Header {
  fullName: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

interface ResumeAstV2SectionStyles {
  container: {
    backgroundColor: string;
    borderColor: string;
    borderWidthPx: number;
    borderRadiusPx: number;
    paddingPx: number;
    marginBottomPx: number;
    shadow?: string;
  };
  title: {
    fontFamily: string;
    fontSizePx: number;
    lineHeight: number;
    fontWeight: number;
    textTransform: string;
    textDecoration: string;
  };
  content: {
    fontFamily: string;
    fontSizePx: number;
    lineHeight: number;
    fontWeight: number;
    textTransform: string;
    textDecoration: string;
  };
}

interface ResumeAstV2Section {
  sectionId: string;
  columnId: string;
  order: number;
  data: Record<string, unknown>;
  styles: ResumeAstV2SectionStyles;
}

export interface ResumeAstV2Theme {
  page: {
    width: number;
    height: number;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    background: string;
  };
  header: {
    name: {
      fontSize: number;
      fontWeight: number;
      fontFamily: string;
      color: string;
      tracking: number;
      alignment: string;
    };
    jobTitle: {
      fontSize: number;
      fontWeight: number;
      fontFamily: string;
      color: string;
      tracking: number;
    };
    contact: {
      fontSize: number;
      fontFamily: string;
      color: string;
      separator: string;
      separatorColor: string;
    };
    divider: {
      show: boolean;
      weight: number;
      color: string;
      marginTop: number;
      marginBottom: number;
    };
  };
  sectionHeader: Record<string, unknown>;
  entry: Record<string, unknown>;
  bullets: Record<string, unknown>;
  technologies: Record<string, unknown>;
  skillsList: Record<string, unknown>;
  textSection: Record<string, unknown>;
  global: {
    fontFamily: string;
    fontSize: number;
    color: string;
    lineHeight: number;
    justify: boolean;
  };
}

export interface ResumeAstV2Input {
  meta: { version: string; generatedAt: string };
  header?: ResumeAstV2Header;
  page: {
    widthMm: number;
    heightMm: number;
    marginTopMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    marginRightMm: number;
  };
  sections: ResumeAstV2Section[];
  globalStyles: {
    background: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
  theme?: ResumeAstV2Theme;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

interface TypstTypographyV2 {
  fontFamily: string;
  fontSizePt: number;
  lineHeight: number;
  fontWeight: number;
  textTransform: string;
  textDecoration: string;
}

interface TypstBoxStyleV2 {
  backgroundColor: string;
  borderColor: string;
  borderWidthPt: number;
  borderRadiusPt: number;
  paddingPt: number;
  marginBottomPt: number;
  shadow?: string;
}

export interface TypstResumeDataV2 {
  meta: { version: string; generatedAt: string };
  header?: {
    fullName: string | null;
    jobTitle: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
    linkedin: string | null;
    github: string | null;
    website: string | null;
  };
  page: {
    widthMm: number;
    heightMm: number;
    marginTopMm: number;
    marginBottomMm: number;
    marginLeftMm: number;
    marginRightMm: number;
  };
  sections: Array<{
    sectionId: string;
    columnId: string;
    order: number;
    data: Record<string, unknown>;
    styles: {
      container: TypstBoxStyleV2;
      title: TypstTypographyV2;
      content: TypstTypographyV2;
    };
  }>;
  globalStyles: {
    background: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
  };
  theme?: ResumeAstV2Theme;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/** 1 CSS px = 0.75 pt at 96 DPI */
const PX_TO_PT = 0.75;

@Injectable()
export class TypstDataSerializerV2Service {
  serialize(ast: ResumeAstV2Input): string {
    const data = this.transform(ast);
    return JSON.stringify(data, null, 2);
  }

  transform(ast: ResumeAstV2Input): TypstResumeDataV2 {
    const result: TypstResumeDataV2 = {
      meta: ast.meta,
      page: {
        widthMm: ast.page.widthMm,
        heightMm: ast.page.heightMm,
        marginTopMm: ast.page.marginTopMm,
        marginBottomMm: ast.page.marginBottomMm,
        marginLeftMm: ast.page.marginLeftMm,
        marginRightMm: ast.page.marginRightMm,
      },
      sections: ast.sections.map((section) => ({
        sectionId: section.sectionId,
        columnId: section.columnId,
        order: section.order,
        data: section.data,
        styles: {
          container: this.transformContainer(section.styles.container),
          title: this.transformTypography(section.styles.title),
          content: this.transformTypography(section.styles.content),
        },
      })),
      globalStyles: ast.globalStyles,
    };

    if (ast.header) {
      result.header = ast.header;
    }

    if (ast.theme) {
      result.theme = this.sanitizeThemeFonts(ast.theme);
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private transformContainer(container: ResumeAstV2SectionStyles['container']): TypstBoxStyleV2 {
    const result: TypstBoxStyleV2 = {
      backgroundColor: container.backgroundColor,
      borderColor: container.borderColor,
      borderWidthPt: this.pxToPt(container.borderWidthPx),
      borderRadiusPt: this.pxToPt(container.borderRadiusPx),
      paddingPt: this.pxToPt(container.paddingPx),
      marginBottomPt: this.pxToPt(container.marginBottomPx),
    };

    if (container.shadow !== undefined) {
      result.shadow = container.shadow;
    }

    return result;
  }

  private transformTypography(typo: ResumeAstV2SectionStyles['title']): TypstTypographyV2 {
    return {
      fontFamily: this.extractPrimaryFont(typo.fontFamily),
      fontSizePt: this.pxToPt(typo.fontSizePx),
      lineHeight: typo.lineHeight,
      fontWeight: typo.fontWeight,
      textTransform: typo.textTransform,
      textDecoration: typo.textDecoration,
    };
  }

  /** Theme values are already in pt/mm/hex -- only font stacks need sanitizing. */
  private sanitizeThemeFonts(theme: ResumeAstV2Theme): ResumeAstV2Theme {
    return {
      ...theme,
      header: {
        ...theme.header,
        name: {
          ...theme.header.name,
          fontFamily: this.extractPrimaryFont(theme.header.name.fontFamily),
        },
        jobTitle: {
          ...theme.header.jobTitle,
          fontFamily: this.extractPrimaryFont(theme.header.jobTitle.fontFamily),
        },
        contact: {
          ...theme.header.contact,
          fontFamily: this.extractPrimaryFont(theme.header.contact.fontFamily),
        },
      },
      global: {
        ...theme.global,
        fontFamily: this.extractPrimaryFont(theme.global.fontFamily),
      },
    };
  }

  private extractPrimaryFont(cssFontFamily: string): string {
    return cssFontFamily.split(',')[0].trim();
  }

  private pxToPt(px: number): number {
    return Math.round(px * PX_TO_PT * 100) / 100;
  }
}
