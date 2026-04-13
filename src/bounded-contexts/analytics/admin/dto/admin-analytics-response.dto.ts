import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UserGrowthEntrySchema = z.object({
  date: z.string(),
  count: z.number().int(),
});

const ResumesByLanguageEntrySchema = z.object({
  language: z.string(),
  count: z.number().int(),
});

const AtsScoreDistributionEntrySchema = z.object({
  bucket: z.string(),
  count: z.number().int(),
});

const MostUsedSectionEntrySchema = z.object({
  sectionTypeId: z.string(),
  title: z.string(),
  key: z.string(),
  count: z.number().int(),
});

const ImportSourceEntrySchema = z.object({
  source: z.string(),
  count: z.number().int(),
});

const ViewSourceEntrySchema = z.object({
  source: z.string(),
  count: z.number().int(),
});

const AdminAnalyticsOverviewDataSchema = z.object({
  userGrowth: z.array(UserGrowthEntrySchema),
  resumesByLanguage: z.array(ResumesByLanguageEntrySchema),
  atsScoreDistribution: z.array(AtsScoreDistributionEntrySchema),
  mostUsedSections: z.array(MostUsedSectionEntrySchema),
  importSources: z.array(ImportSourceEntrySchema),
  viewSources: z.array(ViewSourceEntrySchema),
});

export class AdminAnalyticsOverviewDataDto extends createZodDto(AdminAnalyticsOverviewDataSchema) {}
