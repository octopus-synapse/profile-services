import type { ResumeAst, ResumeDsl } from '@/shared-kernel';
import type { ResolvedTokens } from '../../dsl/token-resolver.service';

const PAPER_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
  legal: { width: 216, height: 356 },
};

const MARGINS = { compact: 10, normal: 15, relaxed: 20, wide: 25 };

const COLUMN_DISTRIBUTIONS: Record<string, [number, number]> = {
  '50-50': [50, 50],
  '60-40': [60, 40],
  '65-35': [65, 35],
  '70-30': [70, 30],
};

export function buildPageLayout(
  dsl: ResumeDsl,
  tokens: ResolvedTokens,
): ResumeAst['page'] {
  const { layout } = dsl;
  const paper = PAPER_SIZES[layout.paperSize];
  const margin = MARGINS[layout.margins];
  const columns = buildColumns(layout.type, layout.columnDistribution);
  const columnGap = tokens.spacing.sectionGapPx / 4;

  return {
    widthMm: paper.width,
    heightMm: paper.height,
    marginTopMm: margin,
    marginBottomMm: margin,
    marginLeftMm: margin,
    marginRightMm: margin,
    columns,
    columnGapMm: columnGap,
  };
}

function buildColumns(
  layoutType: string,
  distribution?: string,
): ResumeAst['page']['columns'] {
  switch (layoutType) {
    case 'single-column':
      return [{ id: 'main', widthPercentage: 100, order: 0 }];

    case 'two-column':
    case 'sidebar-right': {
      const [main, sidebar] = COLUMN_DISTRIBUTIONS[distribution ?? '70-30'] ?? [
        70, 30,
      ];
      return [
        { id: 'main', widthPercentage: main, order: 0 },
        { id: 'sidebar', widthPercentage: sidebar, order: 1 },
      ];
    }

    case 'sidebar-left': {
      const [main, sidebar] = COLUMN_DISTRIBUTIONS[distribution ?? '70-30'] ?? [
        70, 30,
      ];
      return [
        { id: 'sidebar', widthPercentage: sidebar, order: 0 },
        { id: 'main', widthPercentage: main, order: 1 },
      ];
    }

    case 'magazine':
      return [
        { id: 'main', widthPercentage: 60, order: 0 },
        { id: 'sidebar', widthPercentage: 40, order: 1 },
      ];

    case 'compact':
    default:
      return [{ id: 'main', widthPercentage: 100, order: 0 }];
  }
}

export function mapColumnToId(column: string): string {
  if (column === 'sidebar') return 'sidebar';
  return 'main';
}
