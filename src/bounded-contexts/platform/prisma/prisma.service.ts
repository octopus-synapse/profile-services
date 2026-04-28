import { PrismaClient } from '@prisma/client';
import { LoggerPort } from '@/shared-kernel/logger/logger.port';
import { createPrismaClientOptions } from './prisma-client-options';

// Type-safe model accessor for cleanup operations
type DeletableModel = { deleteMany: () => Promise<unknown> };
type PrismaModelKey = keyof Omit<
  PrismaClient,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | '$executeRaw'
  | '$executeRawUnsafe'
  | '$queryRaw'
  | '$queryRawUnsafe'
>;

export class PrismaService extends PrismaClient {
  constructor(private readonly logger: LoggerPort) {
    super(
      createPrismaClientOptions({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
        ],
        errorFormat: 'colorless',
      }),
    );
  }

  // Lifecycle hooks (init/dispose) — bootstrap registers them on the
  // Lifecycle queue. Names match the framework-free `Lifecycle`
  // interface from `@/shared-kernel/lifecycle`.
  async init(): Promise<void> {
    await this.$connect();
    this.logger.log('Successfully connected to database', 'PrismaService');
  }

  async dispose(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from database', 'PrismaService');
  }

  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Test-only safety guard. Not user-facing — prevents catastrophic misuse
      // by failing loud if invoked outside dev/test environments.
      throw new Error('Cannot clean database in production!');
    }

    // Delete in reverse order of dependencies to avoid FK constraint errors
    const modelNames = [
      'message',
      'conversation',
      'blockedUser',
      'resumeCollaborator',
      'shareAnalytics',
      'resumeShare',
      'resumeViewEvent',
      'resumeAnalytics',
      'resumeVersion',
      'sectionItem',
      'resumeSection',
      'sectionType',
      'resumeImport',
      'activity',
      'follow',
      'emailLog',
      'twoFactorBackupCode',
      'twoFactorAuth',
      'userPermission',
      'userGroup',
      'userRoleAssignment',
      'groupPermission',
      'groupRole',
      'rolePermission',
      'group',
      'role',
      'permission',
      'analyticsResumeProjection',
      'mecSyncLog',
      'mecCourse',
      'mecInstitution',
      'spokenLanguage',
      'programmingLanguage',
      'techSkill',
      'techNiche',
      'techArea',
      'resumeStyle',
      'session',
      'account',
      'verificationToken',
      'auditLog',
      'userConsent',
      'onboardingProgress',
      'userPreferences',
      'resume',
      'user',
    ] as const;

    for (const modelName of modelNames) {
      try {
        const model = this[modelName as PrismaModelKey] as DeletableModel | undefined;
        if (model) {
          await model.deleteMany();
        }
      } catch {
        // Model may not exist, skip
      }
    }
  }
}
