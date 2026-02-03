export const FONT_FAMILIES: Record<string, string> = {
  inter: 'Inter, system-ui, sans-serif',
  merriweather: 'Merriweather, Georgia, serif',
  roboto: 'Roboto, Arial, sans-serif',
  'open-sans': 'Open Sans, Arial, sans-serif',
  'playfair-display': 'Playfair Display, Georgia, serif',
  'source-serif': 'Source Serif Pro, Georgia, serif',
  lato: 'Lato, Arial, sans-serif',
  poppins: 'Poppins, Arial, sans-serif',
};

export const FONT_SIZES: Record<string, { base: number; heading: number }> = {
  sm: { base: 14, heading: 18 },
  base: { base: 16, heading: 22 },
  lg: { base: 18, heading: 26 },
};

export const SPACING_SIZES: Record<string, number> = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const DENSITY_FACTORS: Record<string, number> = {
  compact: 0.75,
  comfortable: 1,
  spacious: 1.25,
};

export const BORDER_RADII: Record<string, number> = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

export const SHADOWS: Record<string, string> = {
  none: 'none',
  subtle: '0 1px 2px rgba(0, 0, 0, 0.05)',
  medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  strong: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};
