import { z } from 'zod';

// --- Sub-schemas ---

const PageTokensSchema = z.object({
  width: z.number(),
  height: z.number(),
  marginTop: z.number(),
  marginBottom: z.number(),
  marginLeft: z.number(),
  marginRight: z.number(),
  background: z.string(),
});

const NameTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  tracking: z.number(),
  alignment: z.enum(['left', 'center']),
});

const JobTitleTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  tracking: z.number(),
});

const ContactTokensSchema = z.object({
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  separator: z.string(),
  separatorColor: z.string(),
});

const DividerTokensSchema = z.object({
  show: z.boolean(),
  weight: z.number(),
  color: z.string(),
  marginTop: z.number(),
  marginBottom: z.number(),
});

const HeaderTokensSchema = z.object({
  name: NameTokensSchema,
  jobTitle: JobTitleTokensSchema,
  contact: ContactTokensSchema,
  divider: DividerTokensSchema,
});

const AccentBarTokensSchema = z.object({
  show: z.boolean(),
  width: z.number(),
  height: z.number(),
  color: z.string(),
  radius: z.number(),
  gap: z.number(),
});

const SectionDividerTokensSchema = z.object({
  show: z.boolean(),
  weight: z.number(),
  color: z.string(),
  marginTop: z.number(),
});

const SectionHeaderTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  tracking: z.number(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase']),
  marginTop: z.number(),
  marginBottom: z.number(),
  accentBar: AccentBarTokensSchema,
  divider: SectionDividerTokensSchema,
});

const TypefaceTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  fontFamily: z.string(),
  color: z.string(),
});

const EntrySubtitleTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  marginTop: z.number(),
});

const EmploymentTypeTokensSchema = z.object({
  separator: z.string(),
});

const EntryLinkTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  color: z.string(),
  text: z.string(),
});

const EntryTokensSchema = z.object({
  gap: z.number(),
  title: TypefaceTokensSchema,
  date: TypefaceTokensSchema,
  subtitle: EntrySubtitleTokensSchema,
  employmentType: EmploymentTypeTokensSchema,
  link: EntryLinkTokensSchema,
});

const BulletsTokensSchema = z.object({
  marker: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  spacing: z.number(),
  indent: z.number(),
  bodyIndent: z.number(),
  marginTop: z.number(),
});

const TechnologiesTokensSchema = z.object({
  show: z.boolean(),
  label: z.string(),
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  labelWeight: z.number(),
  marginTop: z.number(),
});

const SkillsListTokensSchema = z.object({
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  separator: z.string(),
  separatorColor: z.string(),
  justify: z.boolean(),
});

const TextSectionTokensSchema = z.object({
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  lineHeight: z.number(),
  justify: z.boolean(),
});

const GlobalTokensSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  color: z.string(),
  lineHeight: z.number(),
  justify: z.boolean(),
});

// --- Main schema ---

export const DesignTokensV2Schema = z.object({
  page: PageTokensSchema,
  header: HeaderTokensSchema,
  sectionHeader: SectionHeaderTokensSchema,
  entry: EntryTokensSchema,
  bullets: BulletsTokensSchema,
  technologies: TechnologiesTokensSchema,
  skillsList: SkillsListTokensSchema,
  textSection: TextSectionTokensSchema,
  global: GlobalTokensSchema,
});

export type DesignTokensV2 = z.infer<typeof DesignTokensV2Schema>;

// --- Defaults ---

export const DESIGN_TOKENS_V2_DEFAULTS: DesignTokensV2 = {
  page: {
    width: 210,
    height: 297,
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
    background: '#ffffff',
  },
  header: {
    name: {
      fontSize: 22,
      fontWeight: 700,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#0f0f0f',
      tracking: 0,
      alignment: 'left',
    },
    jobTitle: {
      fontSize: 14,
      fontWeight: 400,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#555555',
      tracking: 0,
    },
    contact: {
      fontSize: 10,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#555555',
      separator: '|',
      separatorColor: '#cccccc',
    },
    divider: {
      show: true,
      weight: 1,
      color: '#e5e5e5',
      marginTop: 8,
      marginBottom: 8,
    },
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#0f0f0f',
    tracking: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    accentBar: {
      show: true,
      width: 3,
      height: 16,
      color: '#2563eb',
      radius: 1,
      gap: 6,
    },
    divider: {
      show: false,
      weight: 1,
      color: '#e5e5e5',
      marginTop: 4,
    },
  },
  entry: {
    gap: 12,
    title: {
      fontSize: 12,
      fontWeight: 600,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#0f0f0f',
    },
    date: {
      fontSize: 10,
      fontWeight: 400,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#777777',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: 400,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#555555',
      marginTop: 2,
    },
    employmentType: {
      separator: ' - ',
    },
    link: {
      fontSize: 10,
      fontWeight: 400,
      color: '#2563eb',
      text: 'View',
    },
  },
  bullets: {
    marker: '\u2022',
    fontSize: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#333333',
    spacing: 4,
    indent: 12,
    bodyIndent: 6,
    marginTop: 4,
  },
  technologies: {
    show: true,
    label: 'Technologies:',
    fontSize: 9,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#555555',
    labelWeight: 600,
    marginTop: 4,
  },
  skillsList: {
    fontSize: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#333333',
    separator: ',',
    separatorColor: '#999999',
    justify: false,
  },
  textSection: {
    fontSize: 10,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#333333',
    lineHeight: 1.5,
    justify: false,
  },
  global: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 10,
    color: '#0f0f0f',
    lineHeight: 1.4,
    justify: false,
  },
};

// --- Migration from V1 symbolic tokens ---

const FONT_FAMILIES: Record<string, string> = {
  inter: 'Inter, system-ui, sans-serif',
  merriweather: 'Merriweather, Georgia, serif',
  roboto: 'Roboto, Arial, sans-serif',
  'open-sans': 'Open Sans, Arial, sans-serif',
  'playfair-display': 'Playfair Display, Georgia, serif',
  'source-serif': 'Source Serif Pro, Georgia, serif',
  lato: 'Lato, Arial, sans-serif',
  poppins: 'Poppins, Arial, sans-serif',
};

const FONT_SIZES: Record<string, { base: number; heading: number }> = {
  sm: { base: 14, heading: 18 },
  base: { base: 16, heading: 22 },
  lg: { base: 18, heading: 26 },
};

const DENSITY_FACTORS: Record<string, number> = {
  compact: 0.75,
  comfortable: 1,
  spacious: 1.25,
};

const SPACING_SIZES: Record<string, number> = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

interface SymbolicV1Tokens {
  typography: {
    fontFamily: { heading: string; body: string };
    fontSize: string;
    headingStyle: string;
  };
  colors: {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      surface: string;
      text: { primary: string; secondary: string; accent: string };
      border: string;
      divider: string;
    };
  };
  spacing: {
    density: string;
    sectionGap: string;
    itemGap: string;
    contentPadding: string;
  };
}

export function migrateFromSymbolicTokens(v1tokens: SymbolicV1Tokens): DesignTokensV2 {
  const { typography, colors, spacing } = v1tokens;

  const headingFamily = FONT_FAMILIES[typography.fontFamily.heading] ?? FONT_FAMILIES.inter;
  const bodyFamily = FONT_FAMILIES[typography.fontFamily.body] ?? FONT_FAMILIES.inter;
  const sizes = FONT_SIZES[typography.fontSize] ?? FONT_SIZES.base;
  const density = DENSITY_FACTORS[spacing.density] ?? DENSITY_FACTORS.comfortable;
  const sectionGap = SPACING_SIZES[spacing.sectionGap] ?? SPACING_SIZES.md;
  const itemGap = SPACING_SIZES[spacing.itemGap] ?? SPACING_SIZES.sm;
  const contentPadding = SPACING_SIZES[spacing.contentPadding] ?? SPACING_SIZES.md;

  const textPrimary = colors.colors.text.primary;
  const textSecondary = colors.colors.text.secondary;
  const accent = colors.colors.primary;
  const dividerColor = colors.colors.divider;
  const background = colors.colors.background;

  const isUppercase = typography.headingStyle === 'uppercase';
  const showAccentBar = typography.headingStyle === 'accent-border';
  const showDivider = typography.headingStyle === 'underline';

  return {
    page: {
      width: 210,
      height: 297,
      marginTop: Math.round(contentPadding * density),
      marginBottom: Math.round(contentPadding * density),
      marginLeft: contentPadding,
      marginRight: contentPadding,
      background,
    },
    header: {
      name: {
        fontSize: sizes.heading,
        fontWeight: 700,
        fontFamily: headingFamily,
        color: textPrimary,
        tracking: 0,
        alignment: 'left',
      },
      jobTitle: {
        fontSize: Math.round(sizes.base * 0.85),
        fontWeight: 400,
        fontFamily: bodyFamily,
        color: textSecondary,
        tracking: 0,
      },
      contact: {
        fontSize: Math.round(sizes.base * 0.65),
        fontFamily: bodyFamily,
        color: textSecondary,
        separator: '|',
        separatorColor: dividerColor,
      },
      divider: {
        show: true,
        weight: 1,
        color: dividerColor,
        marginTop: Math.round(itemGap * density * 0.5),
        marginBottom: Math.round(itemGap * density * 0.5),
      },
    },
    sectionHeader: {
      fontSize: Math.round(sizes.base * 0.85),
      fontWeight: 700,
      fontFamily: headingFamily,
      color: textPrimary,
      tracking: isUppercase ? 0.5 : 0,
      textTransform: isUppercase ? 'uppercase' : 'none',
      marginTop: Math.round(sectionGap * density),
      marginBottom: Math.round(itemGap * density * 0.5),
      accentBar: {
        show: showAccentBar,
        width: 3,
        height: Math.round(sizes.base),
        color: accent,
        radius: 1,
        gap: 6,
      },
      divider: {
        show: showDivider,
        weight: 1,
        color: dividerColor,
        marginTop: Math.round(4 * density),
      },
    },
    entry: {
      gap: Math.round(itemGap * density),
      title: {
        fontSize: Math.round(sizes.base * 0.75),
        fontWeight: 600,
        fontFamily: bodyFamily,
        color: textPrimary,
      },
      date: {
        fontSize: Math.round(sizes.base * 0.65),
        fontWeight: 400,
        fontFamily: bodyFamily,
        color: textSecondary,
      },
      subtitle: {
        fontSize: Math.round(sizes.base * 0.7),
        fontWeight: 400,
        fontFamily: bodyFamily,
        color: textSecondary,
        marginTop: 2,
      },
      employmentType: {
        separator: ' - ',
      },
      link: {
        fontSize: Math.round(sizes.base * 0.65),
        fontWeight: 400,
        color: accent,
        text: 'View',
      },
    },
    bullets: {
      marker: '\u2022',
      fontSize: Math.round(sizes.base * 0.65),
      fontFamily: bodyFamily,
      color: textPrimary,
      spacing: Math.round(4 * density),
      indent: 12,
      bodyIndent: 6,
      marginTop: Math.round(4 * density),
    },
    technologies: {
      show: true,
      label: 'Technologies:',
      fontSize: Math.round(sizes.base * 0.55),
      fontFamily: bodyFamily,
      color: textSecondary,
      labelWeight: 600,
      marginTop: Math.round(4 * density),
    },
    skillsList: {
      fontSize: Math.round(sizes.base * 0.65),
      fontFamily: bodyFamily,
      color: textPrimary,
      separator: ',',
      separatorColor: dividerColor,
      justify: false,
    },
    textSection: {
      fontSize: Math.round(sizes.base * 0.65),
      fontFamily: bodyFamily,
      color: textPrimary,
      lineHeight: 1.5,
      justify: false,
    },
    global: {
      fontFamily: bodyFamily,
      fontSize: Math.round(sizes.base * 0.65),
      color: textPrimary,
      lineHeight: 1.4,
      justify: false,
    },
  };
}
