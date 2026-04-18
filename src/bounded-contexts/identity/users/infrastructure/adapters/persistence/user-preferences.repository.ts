import type { ApplyMode, EnglishLevel, PaymentCurrency, RemotePolicy } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  type FullUserPreferences,
  type UpdateFullPreferencesData,
  type UpdatePreferencesData,
  type UserApplyCriteriaData,
  type UserPreferences,
  UserPreferencesRepositoryPort,
} from '../../../application/ports/user-preferences.port';

/** Shape that Prisma hands us back when we include applyCriteria on the row. */
type PrismaCriteria = {
  minFit: number | null;
  stacks: string[];
  seniorities: string[];
  remotePolicies: RemotePolicy[];
  paymentCurrencies: PaymentCurrency[];
  minSalaryUsd: number | null;
  defaultCover: string | null;
};

function toCriteriaData(c: PrismaCriteria | null | undefined): UserApplyCriteriaData | null {
  if (!c) return null;
  return {
    minFit: c.minFit,
    stacks: c.stacks,
    seniorities: c.seniorities,
    remotePolicies: c.remotePolicies,
    paymentCurrencies: c.paymentCurrencies,
    minSalaryUsd: c.minSalaryUsd,
    defaultCover: c.defaultCover,
  };
}

export class UserPreferencesRepository extends UserPreferencesRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user !== null;
  }

  async findPreferences(userId: string): Promise<UserPreferences | null> {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        theme: true,
        language: true,
        emailNotifications: true,
      },
    });

    if (!prefs) return null;

    return {
      theme: prefs.theme,
      language: prefs.language,
      emailNotifications: prefs.emailNotifications,
    };
  }

  async updatePreferences(userId: string, data: UpdatePreferencesData): Promise<void> {
    await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        palette: data.palette ?? 'ocean',
        bannerColor: data.bannerColor ?? null,
      },
      update: {
        ...(data.palette !== undefined && { palette: data.palette }),
        ...(data.bannerColor !== undefined && {
          bannerColor: data.bannerColor,
        }),
      },
    });

    // Update User fields if provided (name, photoURL are on User model)
    if (data.name !== undefined || data.photoURL !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.name !== undefined && {
            name: data.name,
          }),
          ...(data.photoURL !== undefined && { image: data.photoURL }),
        },
      });
    }
  }

  async findFullPreferences(userId: string): Promise<FullUserPreferences | null> {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
      include: { applyCriteria: true },
    });

    if (!prefs) return null;

    return {
      id: prefs.id,
      userId: prefs.userId,
      theme: prefs.theme,
      palette: prefs.palette,
      bannerColor: prefs.bannerColor,
      language: prefs.language,
      dateFormat: prefs.dateFormat,
      timezone: prefs.timezone,
      emailNotifications: prefs.emailNotifications,
      resumeExpiryAlerts: prefs.resumeExpiryAlerts,
      weeklyDigest: prefs.weeklyDigest,
      marketingEmails: prefs.marketingEmails,
      emailMilestones: prefs.emailMilestones,
      emailShareExpiring: prefs.emailShareExpiring,
      digestFrequency: prefs.digestFrequency,
      profileVisibility: prefs.profileVisibility,
      showEmail: prefs.showEmail,
      showPhone: prefs.showPhone,
      allowSearchEngineIndex: prefs.allowSearchEngineIndex,
      defaultExportFormat: prefs.defaultExportFormat,
      includePhotoInExport: prefs.includePhotoInExport,
      applyMode: prefs.applyMode,
      applyCriteria: toCriteriaData(prefs.applyCriteria),
      createdAt: prefs.createdAt,
      updatedAt: prefs.updatedAt,
    };
  }

  async upsertFullPreferences(
    userId: string,
    data: UpdateFullPreferencesData,
  ): Promise<FullUserPreferences> {
    const prefs = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        theme: data.theme ?? 'dark',
        palette: data.palette ?? 'ocean',
        bannerColor: data.bannerColor,
        language: data.language ?? 'en',
        dateFormat: data.dateFormat ?? 'MM/DD/YYYY',
        timezone: data.timezone ?? 'UTC',
        emailNotifications: data.emailNotifications ?? true,
        resumeExpiryAlerts: data.resumeExpiryAlerts ?? true,
        weeklyDigest: data.weeklyDigest ?? false,
        marketingEmails: data.marketingEmails ?? false,
        emailMilestones: data.emailMilestones ?? true,
        emailShareExpiring: data.emailShareExpiring ?? true,
        profileVisibility: data.profileVisibility ?? 'private',
        showEmail: data.showEmail ?? false,
        showPhone: data.showPhone ?? false,
        allowSearchEngineIndex: data.allowSearchEngineIndex ?? false,
        defaultExportFormat: data.defaultExportFormat ?? 'pdf',
        includePhotoInExport: data.includePhotoInExport ?? true,
        applyMode: (data.applyMode as ApplyMode | undefined) ?? 'ONE_CLICK',
      },
      update: {
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.palette !== undefined && { palette: data.palette }),
        ...(data.bannerColor !== undefined && {
          bannerColor: data.bannerColor,
        }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.dateFormat !== undefined && { dateFormat: data.dateFormat }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.emailNotifications !== undefined && {
          emailNotifications: data.emailNotifications,
        }),
        ...(data.resumeExpiryAlerts !== undefined && {
          resumeExpiryAlerts: data.resumeExpiryAlerts,
        }),
        ...(data.weeklyDigest !== undefined && {
          weeklyDigest: data.weeklyDigest,
        }),
        ...(data.marketingEmails !== undefined && {
          marketingEmails: data.marketingEmails,
        }),
        ...(data.emailMilestones !== undefined && {
          emailMilestones: data.emailMilestones,
        }),
        ...(data.emailShareExpiring !== undefined && {
          emailShareExpiring: data.emailShareExpiring,
        }),
        ...(data.profileVisibility !== undefined && {
          profileVisibility: data.profileVisibility,
        }),
        ...(data.showEmail !== undefined && { showEmail: data.showEmail }),
        ...(data.showPhone !== undefined && { showPhone: data.showPhone }),
        ...(data.allowSearchEngineIndex !== undefined && {
          allowSearchEngineIndex: data.allowSearchEngineIndex,
        }),
        ...(data.defaultExportFormat !== undefined && {
          defaultExportFormat: data.defaultExportFormat,
        }),
        ...(data.includePhotoInExport !== undefined && {
          includePhotoInExport: data.includePhotoInExport,
        }),
        ...(data.applyMode !== undefined && {
          applyMode: data.applyMode as ApplyMode,
        }),
      },
    });

    // Upsert the criteria row separately so callers can patch a subset of
    // fields. Only touch it when the payload explicitly mentions criteria.
    if (data.applyCriteria) {
      const c = data.applyCriteria;
      await this.prisma.userApplyCriteria.upsert({
        where: { preferencesId: prefs.id },
        create: {
          preferencesId: prefs.id,
          minFit: c.minFit ?? null,
          stacks: c.stacks ?? [],
          seniorities: c.seniorities ?? [],
          remotePolicies: (c.remotePolicies ?? []) as RemotePolicy[],
          paymentCurrencies: (c.paymentCurrencies ?? []) as PaymentCurrency[],
          minSalaryUsd: c.minSalaryUsd ?? null,
          defaultCover: c.defaultCover ?? null,
        },
        update: {
          ...(c.minFit !== undefined && { minFit: c.minFit }),
          ...(c.stacks !== undefined && { stacks: c.stacks }),
          ...(c.seniorities !== undefined && { seniorities: c.seniorities }),
          ...(c.remotePolicies !== undefined && {
            remotePolicies: c.remotePolicies as RemotePolicy[],
          }),
          ...(c.paymentCurrencies !== undefined && {
            paymentCurrencies: c.paymentCurrencies as PaymentCurrency[],
          }),
          ...(c.minSalaryUsd !== undefined && { minSalaryUsd: c.minSalaryUsd }),
          ...(c.defaultCover !== undefined && { defaultCover: c.defaultCover }),
        },
      });
    }

    const hydrated = await this.prisma.userPreferences.findUniqueOrThrow({
      where: { userId },
      include: { applyCriteria: true },
    });

    return {
      id: hydrated.id,
      userId: hydrated.userId,
      theme: hydrated.theme,
      palette: hydrated.palette,
      bannerColor: hydrated.bannerColor,
      language: hydrated.language,
      dateFormat: hydrated.dateFormat,
      timezone: hydrated.timezone,
      emailNotifications: hydrated.emailNotifications,
      resumeExpiryAlerts: hydrated.resumeExpiryAlerts,
      weeklyDigest: hydrated.weeklyDigest,
      marketingEmails: hydrated.marketingEmails,
      emailMilestones: hydrated.emailMilestones,
      emailShareExpiring: hydrated.emailShareExpiring,
      digestFrequency: hydrated.digestFrequency,
      profileVisibility: hydrated.profileVisibility,
      showEmail: hydrated.showEmail,
      showPhone: hydrated.showPhone,
      allowSearchEngineIndex: hydrated.allowSearchEngineIndex,
      defaultExportFormat: hydrated.defaultExportFormat,
      includePhotoInExport: hydrated.includePhotoInExport,
      applyMode: hydrated.applyMode,
      applyCriteria: toCriteriaData(hydrated.applyCriteria),
      createdAt: hydrated.createdAt,
      updatedAt: hydrated.updatedAt,
    };
  }
}
// Keep EnglishLevel import live for future criteria filters (English floor).
export type { EnglishLevel };
