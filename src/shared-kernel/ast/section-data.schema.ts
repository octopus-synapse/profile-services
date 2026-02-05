import { z } from "zod";

export const DateRangeSchema = z.object({
 startDate: z.string(),
 endDate: z.string().optional(),
 isCurrent: z.boolean(),
});

export const LocationSchema = z.object({
 city: z.string().optional(),
 country: z.string().optional(),
 remote: z.boolean().optional(),
});

export const ExperienceItemSchema = z.object({
 id: z.string(),
 title: z.string(),
 company: z.string(),
 location: LocationSchema.optional(),
 dateRange: DateRangeSchema,
 description: z.string().optional(),
 achievements: z.array(z.string()),
 skills: z.array(z.string()),
});

export const EducationItemSchema = z.object({
 id: z.string(),
 institution: z.string(),
 degree: z.string(),
 fieldOfStudy: z.string(),
 location: LocationSchema.optional(),
 dateRange: DateRangeSchema,
 grade: z.string().optional(),
 activities: z.array(z.string()),
});

export const SkillItemSchema = z.object({
 id: z.string(),
 name: z.string(),
 level: z.string().optional(),
 category: z.string().optional(),
});

export const ProjectItemSchema = z.object({
 id: z.string(),
 name: z.string(),
 role: z.string().optional(),
 dateRange: DateRangeSchema.optional(),
 url: z.string().optional(),
 repositoryUrl: z.string().optional(),
 description: z.string().optional(),
 highlights: z.array(z.string()),
 technologies: z.array(z.string()),
});

export const LanguageItemSchema = z.object({
 id: z.string(),
 name: z.string(),
 proficiency: z.string(),
});

export const CertificationItemSchema = z.object({
 id: z.string(),
 name: z.string(),
 issuer: z.string(),
 date: z.string(),
 url: z.string().optional(),
});

export const InterestItemSchema = z.object({
 id: z.string(),
 name: z.string(),
 keywords: z.array(z.string()),
});

export const ReferenceItemSchema = z.object({
 id: z.string(),
 name: z.string(),
 role: z.string(),
 company: z.string().optional(),
 email: z.string().optional(),
 phone: z.string().optional(),
});

export const VolunteerItemSchema = z.object({
 id: z.string(),
 organization: z.string(),
 role: z.string(),
 dateRange: DateRangeSchema,
 description: z.string().optional(),
});

export const AwardItemSchema = z.object({
 id: z.string(),
 title: z.string(),
 issuer: z.string(),
 date: z.string(),
 description: z.string().optional(),
});

export const PublicationItemSchema = z.object({
 id: z.string(),
 title: z.string(),
 publisher: z.string(),
 date: z.string(),
 url: z.string().optional(),
 description: z.string().optional(),
});

export const TextSectionDataSchema = z.object({
 content: z.string(),
});

export const SectionDataSchema = z.discriminatedUnion("type", [
 z.object({
  type: z.literal("experience"),
  items: z.array(ExperienceItemSchema),
 }),
 z.object({
  type: z.literal("education"),
  items: z.array(EducationItemSchema),
 }),
 z.object({
  type: z.literal("skills"),
  items: z.array(SkillItemSchema),
 }),
 z.object({
  type: z.literal("projects"),
  items: z.array(ProjectItemSchema),
 }),
 z.object({
  type: z.literal("languages"),
  items: z.array(LanguageItemSchema),
 }),
 z.object({
  type: z.literal("certifications"),
  items: z.array(CertificationItemSchema),
 }),
 z.object({
  type: z.literal("interests"),
  items: z.array(InterestItemSchema),
 }),
 z.object({
  type: z.literal("references"),
  items: z.array(ReferenceItemSchema),
 }),
 z.object({
  type: z.literal("volunteer"),
  items: z.array(VolunteerItemSchema),
 }),
 z.object({
  type: z.literal("awards"),
  items: z.array(AwardItemSchema),
 }),
 z.object({
  type: z.literal("publications"),
  items: z.array(PublicationItemSchema),
 }),
 z.object({
  type: z.literal("summary"),
  data: TextSectionDataSchema,
 }),
 z.object({
  type: z.literal("objective"),
  data: TextSectionDataSchema,
 }),
 z.object({
  type: z.literal("custom"),
  items: z.array(z.any()),
 }),
]);

export type SectionData = z.infer<typeof SectionDataSchema>;

export type DateRange = z.infer<typeof DateRangeSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type SkillItem = z.infer<typeof SkillItemSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type LanguageItem = z.infer<typeof LanguageItemSchema>;
export type CertificationItem = z.infer<typeof CertificationItemSchema>;
export type InterestItem = z.infer<typeof InterestItemSchema>;
export type ReferenceItem = z.infer<typeof ReferenceItemSchema>;
export type VolunteerItem = z.infer<typeof VolunteerItemSchema>;
export type AwardItem = z.infer<typeof AwardItemSchema>;
export type PublicationItem = z.infer<typeof PublicationItemSchema>;
export type TextSectionData = z.infer<typeof TextSectionDataSchema>;
