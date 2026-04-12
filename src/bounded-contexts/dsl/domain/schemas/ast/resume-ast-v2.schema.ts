import { z } from 'zod';
import { ResumeAstSchema } from './resume-ast.schema';

// ── V2 sub-schemas: ResumeMetadata & AtsConfig ──────────────────────

export const ResumeMetadataSchema = z.object({
  targetRole: z.string().optional(),
  seniorityLevel: z.string().optional(),
  language: z.string(),
});

export const AtsConfigSchema = z.object({
  themeScore: z.number().min(0).max(100),
  resumeScore: z.number().min(0).max(100),
});

// ── Design tokens (inline, self-contained) ──────────────────────────

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
  offsetY: z.number(),
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

const EntryTitleTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  fontFamily: z.string(),
  color: z.string(),
});

const EntryDateTokensSchema = z.object({
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
});

const EntrySubtitleTokensSchema = z.object({
  fontSize: z.number(),
  fontWeight: z.number(),
  fontFamily: z.string(),
  color: z.string(),
});

const EmploymentTypeTokensSchema = z.object({
  separator: z.string(),
});

const LinkTokensSchema = z.object({
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  underline: z.boolean(),
});

const EntryTokensSchema = z.object({
  gap: z.number(),
  title: EntryTitleTokensSchema,
  date: EntryDateTokensSchema,
  subtitle: EntrySubtitleTokensSchema,
  employmentType: EmploymentTypeTokensSchema,
  link: LinkTokensSchema,
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

export const AstDesignTokensSchema = z.object({
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

// ── ResumeAstV2 ─────────────────────────────────────────────────────

export const ResumeAstV2Schema = ResumeAstSchema.extend({
  resumeMetadata: ResumeMetadataSchema,
  atsConfig: AtsConfigSchema,
  theme: AstDesignTokensSchema,
});

export type ResumeAstV2 = z.infer<typeof ResumeAstV2Schema>;
export type ResumeMetadata = z.infer<typeof ResumeMetadataSchema>;
export type AtsConfig = z.infer<typeof AtsConfigSchema>;
export type AstDesignTokens = z.infer<typeof AstDesignTokensSchema>;
