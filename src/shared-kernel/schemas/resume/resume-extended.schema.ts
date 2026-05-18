/**
 * Extended Resume DTOs
 *
 * Additional resume section schemas not part of core onboarding.
 * Used for advanced profile features and achievements.
 */

import { z } from 'zod';

/**
 * Date Format
 * Backend accepts both YYYY-MM-DD (from date inputs) and YYYY-MM (display).
 *
 * P2-#25: the previous shape-only regex accepted `"9999-99-99"` and
 * `"0000-00-00"`, which then `new Date(...)`'d to `Invalid Date` and
 * landed in the DB. The refine below parses the value (substituting a
 * `01` day for `YYYY-MM`) and confirms it's a real calendar date.
 */
const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Invalid date format (YYYY-MM or YYYY-MM-DD)')
  .refine(
    (s) => {
      const full = s.length === 7 ? `${s}-01` : s;
      const parsed = new Date(full);
      if (Number.isNaN(parsed.getTime())) return false;
      // `new Date("2026-02-30")` silently rolls over to 2026-03-02 in
      // some engines. Round-trip the formatted value to reject overflow.
      const iso = parsed.toISOString().slice(0, 10);
      return iso === full;
    },
    { message: 'Invalid calendar date' },
  );

/**
 * Publication Schema
 */
export const PublicationTypeEnum = z.enum(['paper', 'article', 'blog', 'whitepaper']);

export type PublicationType = z.infer<typeof PublicationTypeEnum>;

export const CreatePublicationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title too long'),
  publisher: z.string().min(1, 'Publisher is required').max(200, 'Publisher name too long'),
  publicationType: PublicationTypeEnum,
  url: z.string().url('Invalid URL').optional(),
  publishedAt: DateString,
  abstract: z.string().max(5000, 'Abstract too long').optional(),
  coAuthors: z.array(z.string()).optional(),
  citationCount: z.number().int().min(0).optional(),
  order: z.number().int().min(0).default(0),
});

export type CreatePublication = z.infer<typeof CreatePublicationSchema>;

/**
 * Recommendation Schema
 */
export const CreateRecommendationSchema = z.object({
  author: z.string().min(1, 'Author is required').max(200, 'Author name too long'),
  position: z.string().max(200, 'Position too long').optional(),
  company: z.string().max(200, 'Company name too long').optional(),
  content: z.string().min(1, 'Recommendation content is required').max(5000, 'Content too long'),
  date: DateString.optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateRecommendation = z.infer<typeof CreateRecommendationSchema>;

/**
 * Hackathon Schema
 */
export const CreateHackathonSchema = z.object({
  name: z.string().min(1, 'Hackathon name is required').max(200, 'Name too long'),
  organizer: z.string().min(1, 'Organizer is required').max(200, 'Organizer name too long'),
  position: z.string().max(100, 'Position too long').optional(),
  projectName: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  technologies: z.array(z.string()).optional(),
  teamSize: z.number().int().min(1).optional(),
  date: DateString,
  projectUrl: z.string().url('Invalid URL').optional(),
  award: z.string().max(200, 'Award too long').optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateHackathon = z.infer<typeof CreateHackathonSchema>;

/**
 * Bug Bounty Schema
 */
export const BugBountyPlatformEnum = z.enum(['HackerOne', 'Bugcrowd', 'YesWeHack', 'Custom']);

export const BugBountySeverityEnum = z.enum(['critical', 'high', 'medium', 'low']);

export type BugBountyPlatform = z.infer<typeof BugBountyPlatformEnum>;
export type BugBountySeverity = z.infer<typeof BugBountySeverityEnum>;

export const CreateBugBountySchema = z.object({
  platform: BugBountyPlatformEnum,
  company: z.string().min(1, 'Company is required').max(200, 'Company name too long'),
  severity: BugBountySeverityEnum,
  vulnerabilityType: z.string().min(1, 'Vulnerability type is required').max(100, 'Type too long'),
  cveId: z.string().max(50, 'CVE ID too long').optional(),
  // P2-#A2-35 (deferred): `reward` + `currency` are independent here so a
  // payload like `{ reward: 1000, currency: 'BRL' }` parses, but presenters
  // and FE assume USD. Follow-up plan introduces a `MoneyVO` value object
  // (`{ amount: number; currency: ISO4217 }`) reused across Job.salaryRange.
  // Until that lands, accept ISO-4217 codes only so the field is at least
  // structured. Tracked in BUG_REPORT.md PD-A2-35.
  reward: z.number().min(0).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, 'currency must be an ISO-4217 3-letter code')
    .default('USD'),
  description: z.string().max(5000, 'Description too long').optional(),
  reportedAt: DateString,
  fixedAt: DateString.optional(),
  resolvedAt: DateString.optional(),
  reportUrl: z.string().url('Invalid URL').optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateBugBounty = z.infer<typeof CreateBugBountySchema>;

/**
 * Open Source Contribution Schema
 */
export const OpenSourceRoleEnum = z.enum(['maintainer', 'core_contributor', 'contributor']);

export type OpenSourceRole = z.infer<typeof OpenSourceRoleEnum>;

export const CreateOpenSourceSchema = z.object({
  projectName: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  projectUrl: z.string().url('Invalid project URL'),
  role: OpenSourceRoleEnum,
  description: z.string().max(5000, 'Description too long').optional(),
  technologies: z.array(z.string()).optional(),
  contributions: z.number().int().min(0).optional(),
  stars: z.number().int().min(0).optional(),
  commits: z.number().int().min(0).optional(),
  prsCreated: z.number().int().min(0).optional(),
  prsMerged: z.number().int().min(0).optional(),
  issuesClosed: z.number().int().min(0).optional(),
  isCurrent: z.boolean().default(false),
  startDate: DateString,
  endDate: DateString.optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateOpenSource = z.infer<typeof CreateOpenSourceSchema>;

/**
 * Talk/Presentation Schema
 */
export const TalkTypeEnum = z.enum(['conference', 'meetup', 'webinar', 'podcast', 'workshop']);

export type TalkType = z.infer<typeof TalkTypeEnum>;

export const CreateTalkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title too long'),
  event: z.string().min(1, 'Event is required').max(200, 'Event name too long'),
  eventType: TalkTypeEnum,
  location: z.string().max(200, 'Location too long').optional(),
  date: DateString,
  description: z.string().max(5000, 'Description too long').optional(),
  slidesUrl: z.string().url('Invalid URL').optional(),
  recordingUrl: z.string().url('Invalid URL').optional(),
  attendees: z.number().int().min(0).optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateTalk = z.infer<typeof CreateTalkSchema>;

/**
 * Award/Achievement Schema
 * Note: This is for traditional awards/honors, distinct from GitHub achievements
 */
export const CreateAwardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title too long'),
  issuer: z.string().min(1, 'Issuer is required').max(200, 'Issuer name too long'),
  date: DateString,
  description: z.string().max(2000, 'Description too long').optional(),
  url: z.string().url('Invalid URL').optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateAward = z.infer<typeof CreateAwardSchema>;

/**
 * Interest Schema
 */
export const CreateInterestSchema = z.object({
  name: z.string().min(1, 'Interest is required').max(200, 'Name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateInterest = z.infer<typeof CreateInterestSchema>;

/**
 * Achievement Type Enum
 * Represents different types of professional achievements.
 */
export const AchievementTypeEnum = z.enum([
  'github_stars',
  'kaggle_medal',
  'ctf_win',
  'bug_bounty',
  'certification',
  'custom',
]);

export type AchievementType = z.infer<typeof AchievementTypeEnum>;

/**
 * Achievement Schema
 * For gamification-style achievements (GitHub stars, Kaggle medals, CTF wins, etc.)
 */
export const CreateAchievementSchema = z.object({
  type: AchievementTypeEnum,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  badgeUrl: z.string().url('Invalid badge URL').optional(),
  verificationUrl: z.string().url('Invalid verification URL').optional(),
  achievedAt: DateString,
  value: z.number().int().min(0).optional(),
  rank: z.string().max(100, 'Rank too long').optional(),
  order: z.number().int().min(0).default(0),
});

export type CreateAchievement = z.infer<typeof CreateAchievementSchema>;

// ============================================================================
// Update DTOs (Partial versions)
// ============================================================================

export const UpdatePublicationSchema = CreatePublicationSchema.partial();
export type UpdatePublication = z.infer<typeof UpdatePublicationSchema>;

export const UpdateRecommendationSchema = CreateRecommendationSchema.partial();
export type UpdateRecommendation = z.infer<typeof UpdateRecommendationSchema>;

export const UpdateHackathonSchema = CreateHackathonSchema.partial();
export type UpdateHackathon = z.infer<typeof UpdateHackathonSchema>;

export const UpdateBugBountySchema = CreateBugBountySchema.partial();
export type UpdateBugBounty = z.infer<typeof UpdateBugBountySchema>;

export const UpdateOpenSourceSchema = CreateOpenSourceSchema.partial();
export type UpdateOpenSource = z.infer<typeof UpdateOpenSourceSchema>;

export const UpdateTalkSchema = CreateTalkSchema.partial();
export type UpdateTalk = z.infer<typeof UpdateTalkSchema>;

export const UpdateAwardSchema = CreateAwardSchema.partial();
export type UpdateAward = z.infer<typeof UpdateAwardSchema>;

export const UpdateInterestSchema = CreateInterestSchema.partial();
export type UpdateInterest = z.infer<typeof UpdateInterestSchema>;

export const UpdateAchievementSchema = CreateAchievementSchema.partial();
export type UpdateAchievement = z.infer<typeof UpdateAchievementSchema>;

export type CreatePublicationDto = z.infer<typeof CreatePublicationSchema>;

export type CreateRecommendationDto = z.infer<typeof CreateRecommendationSchema>;

export type CreateHackathonDto = z.infer<typeof CreateHackathonSchema>;

export type CreateBugBountyDto = z.infer<typeof CreateBugBountySchema>;

export type CreateOpenSourceDto = z.infer<typeof CreateOpenSourceSchema>;

export type CreateTalkDto = z.infer<typeof CreateTalkSchema>;

export type CreateAwardDto = z.infer<typeof CreateAwardSchema>;

export type CreateInterestDto = z.infer<typeof CreateInterestSchema>;

export type CreateAchievementDto = z.infer<typeof CreateAchievementSchema>;

export type UpdatePublicationDto = z.infer<typeof UpdatePublicationSchema>;

export type UpdateRecommendationDto = z.infer<typeof UpdateRecommendationSchema>;

export type UpdateHackathonDto = z.infer<typeof UpdateHackathonSchema>;

export type UpdateBugBountyDto = z.infer<typeof UpdateBugBountySchema>;

export type UpdateOpenSourceDto = z.infer<typeof UpdateOpenSourceSchema>;

export type UpdateTalkDto = z.infer<typeof UpdateTalkSchema>;

export type UpdateAwardDto = z.infer<typeof UpdateAwardSchema>;

export type UpdateInterestDto = z.infer<typeof UpdateInterestSchema>;

export type UpdateAchievementDto = z.infer<typeof UpdateAchievementSchema>;
