export type HeadingStyle = {
  fontWeight: number;
  textTransform: 'none' | 'uppercase' | 'lowercase';
  borderBottom: string | null;
  borderLeft: string | null;
  paddingLeft: number;
};

const DEFAULT_STYLE: HeadingStyle = {
  fontWeight: 700,
  textTransform: 'none',
  borderBottom: null,
  borderLeft: null,
  paddingLeft: 0,
};

export function resolveHeadingStyle(
  style: string,
  accentColor: string,
): HeadingStyle {
  switch (style) {
    case 'bold':
      return DEFAULT_STYLE;
    case 'underline':
      return {
        fontWeight: 600,
        textTransform: 'none',
        borderBottom: `2px solid ${accentColor}`,
        borderLeft: null,
        paddingLeft: 0,
      };
    case 'uppercase':
      return {
        fontWeight: 600,
        textTransform: 'uppercase',
        borderBottom: null,
        borderLeft: null,
        paddingLeft: 0,
      };
    case 'accent-border':
      return {
        fontWeight: 700,
        textTransform: 'none',
        borderBottom: null,
        borderLeft: `4px solid ${accentColor}`,
        paddingLeft: 12,
      };
    case 'minimal':
      return {
        fontWeight: 500,
        textTransform: 'none',
        borderBottom: null,
        borderLeft: null,
        paddingLeft: 0,
      };
    default:
      return DEFAULT_STYLE;
  }
}
